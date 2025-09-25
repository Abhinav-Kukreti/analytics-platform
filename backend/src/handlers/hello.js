exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      message: 'Analytics Platform API is running!',
      timestamp: new Date().toISOString(),
      stage: 'Day 0 Complete! 🎉'
    })
  };
};
