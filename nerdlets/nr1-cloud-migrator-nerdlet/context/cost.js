import React, { Component } from 'react';

const CostContext = React.createContext();

export class CostProvider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      noMonths: 60, // default 60 months / 5 years
      compellingEventMonth: 6, // default 6 months
      completionMonth: 24, // default 24 months / 2 years
      increasePercAfterComplete: 1.01
    };
  }

  updateCostContext = stateData => {
    return new Promise(resolve => {
      this.setState(stateData, () => {
        resolve();
      });
    });
  };

  render() {
    const { children } = this.props;

    return (
      <CostContext.Provider
        value={{
          ...this.state,
          updateCostContext: this.updateCostContext
        }}
      >
        {children}
      </CostContext.Provider>
    );
  }
}

export const CostConsumer = CostContext.Consumer;
