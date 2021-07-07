'use strict';

module.exports.main = async () => {
  const paramvalue = process.env.PARAM_VALUE;
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `Your parameter value: ${paramvalue}`,
      },
      null,
      2
    ),
  };
};
