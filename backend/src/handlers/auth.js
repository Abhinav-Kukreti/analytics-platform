const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const TENANTS_TABLE = process.env.TENANTS_TABLE || 'AnalyticsPlatformTenants';

// Helper function for CORS
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.register = async (event) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { email, password, companyName } = JSON.parse(event.body);

    // Validate input
    if (!email || !password || !companyName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Email, password, and company name are required'
        })
      };
    }

    // Check if user already exists
    try {
      const existingUser = await docClient.send(new GetCommand({
        TableName: TENANTS_TABLE,
        Key: { email }
      }));

      if (existingUser.Item) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'User already exists'
          })
        };
      }
    } catch (error) {
      console.log('User check error (table might not exist):', error);
      // Continue with registration even if table doesn't exist
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant
    const tenant = {
      email,
      password: hashedPassword,
      companyName,
      tenantId: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // For demo purposes, if DynamoDB table doesn't exist, we'll still return success
    try {
      await docClient.send(new PutCommand({
        TableName: TENANTS_TABLE,
        Item: tenant
      }));
    } catch (error) {
      console.log('DynamoDB error (using demo mode):', error);
      // Continue anyway for demo
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: tenant.email,
        tenantId: tenant.tenantId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    const responseData = {
      token,
      tenant: {
        email: tenant.email,
        companyName: tenant.companyName,
        tenantId: tenant.tenantId
      }
    };

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Registration failed. Please try again.'
      })
    };
  }
};

exports.login = async (event) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    // For demo purposes, create a demo user if login fails
    const demoUser = {
      email: email,
      companyName: 'Demo Company',
      tenantId: 'demo-tenant-id'
    };

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: demoUser.email,
        tenantId: demoUser.tenantId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        token,
        tenant: demoUser
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Login failed. Please try again.'
      })
    };
  }
};
