const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: 'us-east-1' }); // SES is available in us-east-1

// Send team invitation
exports.inviteUser = async (event) => {
  try {
    const { email, role, tenantId, inviterName, companyName } = JSON.parse(event.body);
    
    // Validate role
    const validRoles = ['ADMIN', 'ANALYST', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: 'Invalid role specified' })
      };
    }
    
    // Check if user already invited or exists
    const existingInvitation = await checkExistingInvitation(email, tenantId);
    if (existingInvitation) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: 'User already invited or exists in team' })
      };
    }
    
    // Create invitation
    const invitationId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    const invitation = {
      invitationId,
      email,
      role,
      tenantId,
      inviterName,
      companyName,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt
    };
    
    // Save invitation
    await dynamodb.put({
      TableName: process.env.TEAM_INVITATIONS_TABLE,
      Item: invitation
    }).promise();
    
    // Send email invitation
    await sendInvitationEmail(invitation);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Invitation sent successfully',
        invitationId
      })
    };
    
  } catch (error) {
    console.error('Error sending invitation:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Failed to send invitation' })
    };
  }
};

// Accept invitation
exports.acceptInvitation = async (event) => {
  try {
    const { invitationId, userInfo } = JSON.parse(event.body);
    
    // Get invitation
    const invitation = await dynamodb.get({
      TableName: process.env.TEAM_INVITATIONS_TABLE,
      Key: { invitationId }
    }).promise();
    
    if (!invitation.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: 'Invitation not found' })
      };
    }
    
    const inv = invitation.Item;
    
    // Check if invitation is still valid
    if (inv.status !== 'PENDING' || new Date(inv.expiresAt) < new Date()) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: 'Invitation expired or already used' })
      };
    }
    
    // Create user profile
    const userId = uuidv4();
    const userProfile = {
      userId,
      email: inv.email,
      tenantId: inv.tenantId,
      role: inv.role,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      avatar: userInfo.avatar || '',
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE'
    };
    
    // Save user profile
    await dynamodb.put({
      TableName: process.env.USER_PROFILES_TABLE,
      Item: userProfile
    }).promise();
    
    // Update invitation status
    await dynamodb.update({
      TableName: process.env.TEAM_INVITATIONS_TABLE,
      Key: { invitationId },
      UpdateExpression: 'SET #status = :status, acceptedAt = :acceptedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'ACCEPTED',
        ':acceptedAt': new Date().toISOString()
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Invitation accepted successfully',
        userProfile
      })
    };
    
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ error: 'Failed to accept invitation' })
    };
  }
};

// Helper functions
const checkExistingInvitation = async (email, tenantId) => {
  try {
    const params = {
      TableName: process.env.TEAM_INVITATIONS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      FilterExpression: 'tenantId = :tenantId AND #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':email': email,
        ':tenantId': tenantId,
        ':status': 'PENDING'
      }
    };
    
    const result = await dynamodb.query(params).promise();
    return result.Items && result.Items.length > 0;
  } catch (error) {
    console.error('Error checking existing invitation:', error);
    return false;
  }
};

const sendInvitationEmail = async (invitation) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/accept-invitation/${invitation.invitationId}`;
  
  const emailParams = {
    Source: process.env.FROM_EMAIL || 'noreply@analytics-platform.com',
    Destination: {
      ToAddresses: [invitation.email]
    },
    Message: {
      Subject: {
        Data: `Invitation to join ${invitation.companyName} on Analytics Platform`
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">You're invited to join ${invitation.companyName}!</h2>
              
              <p>Hi there,</p>
              
              <p><strong>${invitation.inviterName}</strong> has invited you to join their team on Analytics Platform with the role of <strong>${invitation.role}</strong>.</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #374151;">What you'll get:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Access to real-time analytics dashboard</li>
                  <li>Professional data export capabilities</li>
                  <li>Team collaboration features</li>
                  <li>Role-based permissions</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background-color: #4f46e5; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; font-weight: 500;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                This invitation will expire in 7 days. If you don't want to join this team, 
                you can simply ignore this email.
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">
                Thanks,<br>
                The Analytics Platform Team
              </p>
            </div>
          `
        }
      }
    }
  };
  
  try {
    await ses.sendEmail(emailParams).promise();
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error - invitation was created successfully
  }
};
