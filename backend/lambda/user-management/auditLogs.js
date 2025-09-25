const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get audit logs for a tenant
exports.getAuditLogs = async (event) => {
  try {
    const { tenantId } = event.pathParameters;
    const { limit = 50, startDate, endDate } = event.queryStringParameters || {};
    
    let params = {
      TableName: process.env.AUDIT_LOGS_TABLE,
      IndexName: 'TenantTimeIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      },
      ScanIndexForward: false, // Latest first
      Limit: parseInt(limit)
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND #timestamp BETWEEN :startDate AND :endDate';
      params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
      params.ExpressionAttributeValues[':startDate'] = startDate;
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }
    
    const result = await dynamodb.query(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        logs: result.Items,
        count: result.Count,
        lastEvaluatedKey: result.LastEvaluatedKey
      })
    };
    
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Failed to retrieve audit logs' })
    };
  }
};

// Get audit log statistics
exports.getAuditStats = async (event) => {
  try {
    const { tenantId } = event.pathParameters;
    
    // Get logs from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const params = {
      TableName: process.env.AUDIT_LOGS_TABLE,
      IndexName: 'TenantTimeIndex',
      KeyConditionExpression: 'tenantId = :tenantId AND #timestamp > :startDate',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':startDate': thirtyDaysAgo
      }
    };
    
    const result = await dynamodb.query(params).promise();
    
    // Calculate statistics
    const stats = {
      totalActions: result.Count,
      actionsByType: {},
      actionsByUser: {},
      actionsLast7Days: 0,
      actionsToday: 0
    };
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().split('T')[0];
    
    result.Items.forEach(log => {
      // Count by action type
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
      
      // Count by user
      stats.actionsByUser[log.userId] = (stats.actionsByUser[log.userId] || 0) + 1;
      
      // Count recent actions
      if (log.timestamp > sevenDaysAgo) {
        stats.actionsLast7Days++;
      }
      
      if (log.timestamp.startsWith(today)) {
        stats.actionsToday++;
      }
    });
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify(stats)
    };
    
  } catch (error) {
    console.error('Error getting audit stats:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Failed to retrieve audit statistics' })
    };
  }
};
