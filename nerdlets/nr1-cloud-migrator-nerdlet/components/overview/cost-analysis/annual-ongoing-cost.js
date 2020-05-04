// this calculation is derived from the AWS directional business case from key account examples
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Header } from 'semantic-ui-react';

export default class AnnualOngoingCosts extends React.PureComponent {
  render() {
    const { sourceData, targetData, completionMonth } = this.props;

    const years = Math.floor(sourceData.length / 12);

    const data = {
      labels: [],
      datasets: []
    };

    if (years === 0) {
      return 'Unavailable, your migration must be atleast 12 months.';
    } else {
      data.datasets.push({
        type: 'bar',
        label: `Remain in source environment`,
        data: [],
        fill: false,
        backgroundColor: '#EC932F',
        borderColor: '#EC932F',
        hoverBackgroundColor: '#EC932F',
        hoverBorderColor: '#EC932F'
      });

      data.datasets.push({
        type: 'bar',
        label: 'Migrate to target environment',
        data: [],
        fill: false,
        backgroundColor: 'rgba(75,192,192,1)',
        borderColor: 'rgba(75,192,192,1)',
        hoverBackgroundColor: 'rgba(75,192,192,1)',
        hoverBorderColor: 'rgba(75,192,192,1)'
      });

      for (let z = 1; z < years + 1; z++) {
        data.labels.push(
          `Year ${z} ${
            completionMonth === 12 * z ? '(Migration Complete)' : ''
          }`
        );
        const index = 12 * z - 1;
        data.datasets[0].data.push(sourceData[index]);
        data.datasets[1].data.push(targetData[index]);
      }
    }

    return (
      <div style={{ height: '500px', paddingBottom: '50px' }}>
        <Header as="h5">
          {sourceData.length < 12 ? '' : 'Annual '}Ongoing Costs
        </Header>

        <Bar
          data={data}
          width={100}
          height={350}
          options={{ maintainAspectRatio: false }}
        />
      </div>
    );
  }
}
