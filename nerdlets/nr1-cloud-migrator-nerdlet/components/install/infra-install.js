import React from 'react';

export default class InfraWrapper extends React.Component {
  render() {
    window.location.replace(
      `https://infrastructure.newrelic.com/accounts/${this.props.accountId}/hosts/network`
    );
    return <></>;
  }
}
