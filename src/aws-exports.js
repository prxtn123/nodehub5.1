/**
 * AWS Amplify Configuration
 * Reads from REACT_APP_* environment variables so credentials are never
 * hardcoded in source.  Copy .env.example → .env and fill in real values.
 */
const awsconfig = {
  aws_project_region:            process.env.REACT_APP_AWS_REGION         || 'us-east-1',
  aws_cognito_region:            process.env.REACT_APP_AWS_REGION         || 'us-east-1',
  aws_user_pools_id:             process.env.REACT_APP_USER_POOL_ID       || '',
  aws_user_pools_web_client_id:  process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '',
};

export default awsconfig;
