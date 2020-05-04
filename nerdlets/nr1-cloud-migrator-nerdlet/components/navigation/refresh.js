import React from 'react';
import { Button } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class RefreshSelector extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false
    };
  }

  render() {
    return (
      <DataConsumer>
        {({ init }) => (
          <Button
            content="Refresh"
            icon="refresh"
            loading={this.state.isLoading}
            className="filter-button"
            onClick={() =>
              this.setState({ isLoading: true }, async () => {
                await init();
                this.setState({ isLoading: false });
              })
            }
          />
        )}
      </DataConsumer>
    );
  }
}
