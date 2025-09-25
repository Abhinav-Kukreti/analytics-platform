const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// 🔥 FIXED: Dynamically construct the API Gateway endpoint
const getApiGatewayEndpoint = (event) => {
  const { domainName, stage } = event.requestContext;
  return `https://${domainName}/${stage}`;
};

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

// Handle WebSocket connections
exports.connectHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log('🔌 WebSocket Connect:', connectionId);

  try {
    const now = Date.now();
    await dynamodb.put({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId: connectionId,
        timestamp: now,
        ttl: Math.floor(now / 1000) + 7200, // 2 hours TTL
        status: 'connected'
      }
    }).promise();

    console.log('✅ Connection stored successfully');
    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('❌ Connect error:', error);
    return { statusCode: 500, body: 'Failed to connect' };
  }
};

// Handle WebSocket disconnections
exports.disconnectHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log('🔌 WebSocket Disconnect:', connectionId);

  try {
    await dynamodb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId: connectionId }
    }).promise();

    console.log('✅ Connection removed successfully');
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('❌ Disconnect error:', error);
    return { statusCode: 500, body: 'Failed to disconnect' };
  }
};

// Handle default messages
exports.defaultHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log('📨 WebSocket Default:', { connectionId, body: event.body });

  // 🔥 FIXED: Create API Gateway instance with correct endpoint
  const endpoint = getApiGatewayEndpoint(event);
  const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: endpoint
  });

  try {
    let message = {};
    try {
      message = JSON.parse(event.body || '{}');
    } catch (e) {
      message = { action: 'unknown' };
    }

    const { action, tenantId } = message;

    if (action === 'heartbeat') {
      // Respond to heartbeat to keep connection alive
      await postToConnection(apiGateway, connectionId, {
        type: 'heartbeat-response',
        timestamp: Date.now()
      });
      return { statusCode: 200, body: 'Heartbeat received' };
    }

    if (action === 'join-tenant') {
      // Update connection with tenant info
      await dynamodb.update({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId: connectionId },
        UpdateExpression: 'SET tenantId = :tenantId, joinedAt = :joinedAt, #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':tenantId': tenantId,
          ':joinedAt': Date.now(),
          ':status': 'joined'
        }
      }).promise();

      await postToConnection(apiGateway, connectionId, {
        type: 'joined',
        tenantId: tenantId,
        message: `Successfully joined tenant ${tenantId}`
      });
      
      console.log(`✅ Connection ${connectionId} joined tenant ${tenantId}`);
      return { statusCode: 200, body: 'Joined tenant' };
    }

    // Echo for unknown actions
    await postToConnection(apiGateway, connectionId, {
      type: 'echo',
      originalMessage: message,
      timestamp: Date.now()
    });

    return { statusCode: 200, body: 'Message processed' };
  } catch (error) {
    console.error('❌ Default handler error:', error);
    return { statusCode: 500, body: 'Failed to process message' };
  }
};

// 🔥 FIXED: Utility function with apiGateway parameter
const postToConnection = async (apiGateway, connectionId, data) => {
  try {
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();
    console.log('✅ Message sent to connection:', connectionId);
    return true;
  } catch (error) {
    console.error('❌ Failed to post to connection:', connectionId, error);
    
    // Clean up stale connections (410 = Gone)
    if (error.statusCode === 410 || error.statusCode === 403) {
      try {
        await dynamodb.delete({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId: connectionId }
        }).promise();
        console.log('🧹 Cleaned up stale connection:', connectionId);
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup connection:', cleanupError);
      }
    }
    return false;
  }
};

// 🔥 FIXED: Broadcast function with dynamic endpoint
exports.broadcastToTenant = async (tenantId, data, event) => {
  console.log('📢 Broadcasting to tenant:', tenantId);

  // Create API Gateway instance with correct endpoint
  const endpoint = getApiGatewayEndpoint(event);
  const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: endpoint
  });

  try {
    const connections = await dynamodb.scan({
      TableName: CONNECTIONS_TABLE,
      FilterExpression: 'tenantId = :tenantId AND #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':status': 'joined'
      }
    }).promise();

    if (connections.Items.length === 0) {
      console.log('📭 No active connections for tenant:', tenantId);
      return true;
    }

    const promises = connections.Items.map(async ({ connectionId }) => {
      return postToConnection(apiGateway, connectionId, data);
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`✅ Broadcast complete: ${successful}/${connections.Items.length} successful`);
    return true;
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    return false;
  }
};

// 🔥 NEW: Helper function for other handlers to use broadcast
exports.broadcastFromAnalytics = async (tenantId, data) => {
  // For analytics broadcasts, we need to construct the endpoint manually
  // This is a simplified version when we don't have the event context
  const apiId = process.env.WEBSOCKET_API_ID || 'q6s7133e0e'; // Your API ID
  const region = process.env.AWS_REGION || 'us-east-1';
  const stage = process.env.STAGE || 'dev';
  
  const endpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`;
  const apiGateway = new AWS.ApiGatewayManagementApi({ endpoint });

  try {
    const connections = await dynamodb.scan({
      TableName: CONNECTIONS_TABLE,
      FilterExpression: 'tenantId = :tenantId AND #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':status': 'joined'
      }
    }).promise();

    if (connections.Items.length === 0) {
      console.log('📭 No active connections for tenant:', tenantId);
      return true;
    }

    const promises = connections.Items.map(async ({ connectionId }) => {
      return postToConnection(apiGateway, connectionId, data);
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`✅ Analytics broadcast complete: ${successful}/${connections.Items.length} successful`);
    return true;
  } catch (error) {
    console.error('❌ Analytics broadcast error:', error);
    return false;
  }
};
