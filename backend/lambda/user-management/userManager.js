const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// User roles and their permissions
const USER_ROLES = {
  ADMIN: {
    name: 'Admin',
    permissions: [
      'read:analytics',
      'write:analytics', 
      'manage:users',
      'manage:settings',
      'export:data',
      'view:audit_logs'
    ]
  },
  ANALYST: {
    name: 'Analyst', 
    permissions: [
      'read:analytics',
      'write:analytics',
      'export:data'
    ]
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      'read:analytics'
    ]
  }
};

// Get user profile with role and permissions
exports.getUserProfile = async (event) => {
  try {
    const { userId } = JSON.parse(event.body);
    
    const params = {
      TableName: process.env.USER_PROFILES_TABLE,
      Key: { userId }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: 'User profile not found' })
      };
    }
    
    const userProfile = result.Item;
    const roleInfo = USER_ROLES[userProfile.role] || USER_ROLES.VIEWER;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        ...userProfile,
        roleInfo,
        permissions: roleInfo.permissions
      })
    };
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Update user profile
exports.updateUserProfile = async (event) => {
  try {
    const { userId, updates } = JSON.parse(event.body);
    
    // Prepare update expression
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    Object.keys(updates).forEach((key, index) => {
      if (['firstName', 'lastName', 'avatar', 'preferences', 'role'].includes(key)) {
        updateExpression.push(`#${key} = :val${index}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
      }
    });
    
    if (updateExpression.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: 'No valid updates provided' })
      };
    }
    
    const params = {
      TableName: process.env.USER_PROFILES_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}, updatedAt = :updatedAt`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamodb.update(params).promise();
    
    // Log the update
    await logAuditEvent({
      tenantId: result.Attributes.tenantId,
      userId: userId,
      action: 'USER_PROFILE_UPDATED',
      details: { updatedFields: Object.keys(updates) }
    });
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify(result.Attributes)
    };
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Get team members for a tenant
exports.getTeamMembers = async (event) => {
  try {
    const { tenantId } = event.pathParameters;
    
    const params = {
      TableName: process.env.USER_PROFILES_TABLE,
      IndexName: 'TenantIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    };
    
    const result = await dynamodb.query(params).promise();
    
    // Enhance with role information
    const teamMembers = result.Items.map(user => {
      const roleInfo = USER_ROLES[user.role] || USER_ROLES.VIEWER;
      return {
        ...user,
        roleInfo
      };
    });
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        teamMembers,
        totalCount: result.Count
      })
    };
    
  } catch (error) {
    console.error('Error getting team members:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Helper function to log audit events
const logAuditEvent = async ({ tenantId, userId, action, details = {} }) => {
  const logId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const params = {
    TableName: process.env.AUDIT_LOGS_TABLE,
    Item: {
      logId,
      tenantId,
      userId,
      action,
      details,
      timestamp,
      createdAt: timestamp
    }
  };
  
  try {
    await dynamodb.put(params).promise();
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

module.exports = { USER_ROLES, logAuditEvent };
