class OfflineSSM {
    constructor(serverless, options) {
      this.serverless = serverless;
      this.service = serverless.service;
      this.config = (this.service.custom && this.service.custom.offlineSSM) || {};
      this.stage = serverless.service.provider.stage;
  
      if (!this.shouldExecute()) {
        return;
      }
  
      const aws = this.serverless.getProvider('aws');
      const originalRequest = aws.request.bind(aws);
  
      aws.request = (service, method, params) => {
        if (service !== 'SSM' || method !== 'getParameter') {
          return originalRequest(service, method, params, options);
        }
        const { Name } = params;
        const Parameter = this.config.ssm[Name];
        return Promise.resolve({ Parameter });
      };
  
      this.serverless.setProvider('aws', aws);
    }
  
    shouldExecute() {
      if (this.config.stages && this.config.stages.includes(this.stage)) {
        return true;
      }
      return false;
    }
  }
  
  module.exports = OfflineSSM;