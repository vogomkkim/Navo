const JSDOMEnvironment = require('jest-environment-jsdom').default;

// A custom environment to set the TextEncoder that is required by React 18.
// See https://github.com/jsdom/jsdom/issues/2524
// See https://github.com/facebook/react/issues/24434
class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.IS_REACT_ACT_ENVIRONMENT = true;
  }
}

module.exports = CustomJSDOMEnvironment;
