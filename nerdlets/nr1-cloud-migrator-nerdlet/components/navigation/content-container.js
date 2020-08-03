import React from 'react';
import { DataConsumer } from '../../context/data';
import MigrateWorkloads from '../migrate-workloads/migrate-workloads';
import MigrationOverview from '../overview/migration/migration-overview';
import Setup from '../getting-started/setup';
import DatacenterCosts from '../getting-started/datacenter-costs/datacenter-costs';
import WorkloadOverview from '../overview/workload/workload-overview';
import CreateWorkloads from '../getting-started/create-workloads/create-workloads';
import MigrationTracker from '../migrate/migration-tracker';
import MigrationPerformance from '../migrate/performance/migration-performance';
import CostAnalysis from '../overview/cost-analysis/cost-analysis';
import TagCompliance from '../tag-compliance/tag-compliance';
import ComplexityProfiler from '../complexity-profiler';
import { Segment } from 'semantic-ui-react';

export default class ContentContainer extends React.PureComponent {
  render() {
    const { height } = this.props;
    return (
      <DataConsumer>
        {({ selectedPage, selectedMigration }) => {
          const componentSelect = () => {
            switch (selectedPage) {
              case 'setup':
                return <Setup />;
              case 'createWorkloads':
                return <CreateWorkloads />;
              case 'migrateWorkloads':
                return <MigrateWorkloads />;
              case 'migrationOverview':
                return <MigrationOverview />;
              case 'datacenterCosts':
                return <DatacenterCosts />;
              case 'workloadOverview':
                return (
                  <WorkloadOverview selectedMigration={selectedMigration} />
                );
              case 'migrationTracker':
                return <MigrationTracker />;
              case 'migrationPerformance':
                return <MigrationPerformance />;
              case 'costAnalysis':
                return <CostAnalysis />;
              case 'tagCompliance':
                return <TagCompliance />;
              case 'complexityProfiler':
                return <ComplexityProfiler />;
              default:
                return selectedPage;
            }
          };

          return (
            <Segment
              style={{
                height,
                overflowY: 'scroll',
                overflowX: 'hidden'
              }}
            >
              <div style={{ paddingLeft: '10px', paddingRight: '10px' }}>
                {componentSelect()}
              </div>
            </Segment>
          );
        }}
      </DataConsumer>
    );
  }
}
