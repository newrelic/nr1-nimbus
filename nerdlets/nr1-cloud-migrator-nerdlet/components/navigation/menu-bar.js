/* eslint 
no-console: 0
*/
import React from 'react';
import Select from 'react-select';
import RefreshSelector from './refresh';
import { DataConsumer } from '../../context/data';
import CostPeriod from './cost-period';
import { getTagValue } from '../../../shared/lib/utils';
import { Popup, Icon } from 'semantic-ui-react';

export default class MenuBar extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { migrationId: '' };
  }

  handleMapMenuChange = (
    selectedMigration,
    updateDataContextState,
    pluckWorkload
  ) => {
    const wl = pluckWorkload(selectedMigration.guid);
    this.setState({ migrationId: getTagValue(wl.tags, 'm.MigrationId') });
    updateDataContextState({ selectedMigration });
  };

  render() {
    return (
      <DataConsumer>
        {({
          workloads,
          selectedMigration,
          updateDataContextState,
          pluckWorkload
        }) => {
          const { migrationId } = this.state;
          const tgtWorkload = workloads.filter(wl =>
            getTagValue(wl.tags, 'tgtWorkloadGuid')
          );
          const availableMigrations = tgtWorkload
            .filter(wl => getTagValue(wl.tags, 'tgtWorkloadGuid'))
            .map(wl => ({
              value: wl.name,
              label: wl.name,
              guid: wl.guid
            }));

          const targetCloud = getTagValue(
            ((tgtWorkload || {})[0] || {}).tags || [],
            'cloud'
          );
          const targetRegion = getTagValue(
            ((tgtWorkload || {})[0] || {}).tags || [],
            'region'
          );

          return (
            <div>
              <div className="utility-bar">
                <div className="react-select-input-group">
                  <label>Select Migration Workload</label>
                  <Select
                    options={availableMigrations}
                    onChange={migration =>
                      this.handleMapMenuChange(
                        migration,
                        updateDataContextState,
                        pluckWorkload
                      )
                    }
                    value={selectedMigration}
                    classNamePrefix="react-select"
                  />
                </div>

                {selectedMigration && migrationId ? (
                  <Popup
                    trigger={
                      <span>
                        <Icon name="tag" color="black" size="large" circular />
                        <b>Migration ID:</b> {migrationId}&nbsp;{' '}
                        <b>Target Cloud:</b> {targetCloud}:&nbsp;{targetRegion}
                      </span>
                    }
                    content="Tag your cloud instances with this MigrationId tag for automatic detection and compliance."
                    position="top center"
                  />
                ) : (
                  ''
                )}

                <div className="flex-push" />

                <CostPeriod />

                <RefreshSelector />
              </div>
            </div>
          );
        }}
      </DataConsumer>
    );
  }
}
