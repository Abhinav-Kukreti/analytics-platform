const AWS = require('aws-sdk');
const { verifyToken } = require('../utils/auth-middleware');
const { broadcastToTenant } = require('./websocket');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.ingestData = async (event) => {
  try {
    // Authenticate request
    const decoded = verifyToken(event);
    const tenantId = decoded.tenantId;
    
    const { eventType, eventData, userId } = JSON.parse(event.body);

    const analyticsRecord = {
      tenantId,
      timestamp: Date.now(),
      eventType,
      eventData,
      userId,
      id: `${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Store in DynamoDB
    await dynamodb.put({
      TableName: process.env.ANALYTICS_TABLE,
      Item: analyticsRecord
    }).promise();

    // 🔥 NEW: Broadcast real-time update to all tenant connections
    await broadcastToTenant(tenantId, {
      type: 'new-event',
      data: analyticsRecord,
      timestamp: Date.now()
    });

    console.log('Event ingested and broadcasted:', analyticsRecord.id);

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Event recorded and broadcasted successfully',
        eventId: analyticsRecord.id
      })
    };
  } catch (error) {
    console.error('Ingest error:', error);
    return {
      statusCode: error.message === 'No token provided' || error.message === 'Invalid token' ? 401 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Keep existing getAnalytics function unchanged
exports.getAnalytics = async (event) => {
  try {
    const decoded = verifyToken(event);
    const tenantId = decoded.tenantId;
    
    const { startTime, endTime, eventType } = event.queryStringParameters || {};

    let filterExpression = 'tenantId = :tenantId';
    let expressionAttributeValues = { ':tenantId': tenantId };

    if (startTime && endTime) {
      filterExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
      expressionAttributeValues[':startTime'] = parseInt(startTime);
      expressionAttributeValues[':endTime'] = parseInt(endTime);
    }

    if (eventType) {
      filterExpression += ' AND eventType = :eventType';
      expressionAttributeValues[':eventType'] = eventType;
    }

    const params = {
      TableName: process.env.ANALYTICS_TABLE,
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: expressionAttributeValues
    };

    if (startTime && endTime) {
      params.KeyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
      params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
    }

    const result = await dynamodb.query(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: result.Items,
        count: result.Count
      })
    };
  } catch (error) {
    console.error('Get analytics error:', error);
    return {
      statusCode: error.message === 'No token provided' || error.message === 'Invalid token' ? 401 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
