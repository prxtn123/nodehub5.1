/**
 * Cognito Service
 *
 * SECURITY: Handles all AWS Cognito operations on the backend.
 * This ensures AWS credentials are never exposed to the frontend.
 */

const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const REGION = process.env.AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.AWS_USER_POOL_ID;

if (!USER_POOL_ID) {
  console.error('SECURITY WARNING: AWS_USER_POOL_ID environment variable is not set!');
}

// Initialize Cognito client with server-side AWS credentials
const cognitoClient = new CognitoIdentityProviderClient({
  region: REGION,
  // AWS SDK will automatically use credentials from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. IAM role (if running on EC2/ECS/Lambda)
  // 3. AWS credentials file (~/.aws/credentials)
});

/**
 * List all users in the Cognito User Pool
 * @returns {Promise<Array>} Array of user objects
 */
async function listUsers() {
  try {
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
    });

    const response = await cognitoClient.send(command);

    // Transform Cognito user format to simplified format
    const users = response.Users.map(user => {
      const attributes = {};
      user.Attributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        username: user.Username,
        email: attributes.email || '',
        status: user.UserStatus,
        isAdmin: attributes['custom:admin'] === 'true',
        enabled: user.Enabled,
        createdDate: user.UserCreateDate,
        lastModifiedDate: user.UserLastModifiedDate,
      };
    });

    return users;
  } catch (error) {
    console.error('[Cognito] Error listing users:', error);
    throw new Error('Failed to list users from Cognito');
  }
}

/**
 * Delete a user from the Cognito User Pool
 * @param {string} username - The username to delete
 * @returns {Promise<void>}
 */
async function deleteUser(username) {
  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    await cognitoClient.send(command);
    console.log(`[Cognito] User ${username} deleted successfully`);
  } catch (error) {
    console.error(`[Cognito] Error deleting user ${username}:`, error);
    throw new Error('Failed to delete user from Cognito');
  }
}

module.exports = {
  listUsers,
  deleteUser,
};
