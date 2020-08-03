import React from 'react';
import { Menu, Icon, Accordion } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import Tags from './tags';

export default class LeftMenu extends React.PureComponent {
  state = { activeIndex: 0 };

  handleClick = (e, titleProps) => {
    const { index } = titleProps;
    const { activeIndex } = this.state;
    const newIndex = activeIndex === index ? -1 : index;

    this.setState({ activeIndex: newIndex });
  };

  render() {
    const { height } = this.props;
    const { activeIndex } = this.state;

    return (
      <DataConsumer>
        {({
          selectedMigration,
          selectedPage,
          updateDataContextState,
          tagSelection,
          workloads
        }) => {
          const menuItem = (name, val, icon) => {
            // let n = name;
            // if(icon){
            //   n =
            // }
            return (
              <Menu.Item
                style={{
                  fontSize: '13px'
                }}
                icon={icon || 'circle thin'}
                name={name}
                active={selectedPage === val}
                onClick={() => updateDataContextState({ selectedPage: val })}
              />
            );
          };

          return (
            <Menu
              vertical
              pointing
              style={{
                backgroundColor: 'white',
                height: height,
                marginTop: 0
              }}
            >
              <Menu.Item>
                <Menu.Header>Getting Started</Menu.Header>
                <Menu.Menu>
                  {menuItem('Setup', 'setup', 'cog')}
                  {menuItem('Datacenter Costs', 'datacenterCosts', 'server')}
                  {menuItem('Create Workloads', 'createWorkloads', 'sign-in')}
                  {menuItem(
                    'Migrate Workloads',
                    'migrateWorkloads',
                    'cloud upload'
                  )}
                  {menuItem(
                    'Complexity Profiling',
                    'complexityProfiler',
                    'sitemap'
                  )}
                </Menu.Menu>
              </Menu.Item>

              <Menu.Item>
                <Menu.Header>Overview</Menu.Header>
                <Menu.Menu>
                  <Accordion
                    as={Menu}
                    vertical
                    style={{
                      border: 'none',
                      minHeight: '25px',
                      paddingTop: '0px',
                      paddingLeft: '0px',
                      paddingBottom: '0px',
                      boxShadow: 'none',
                      fontSize: '15px'
                    }}
                  >
                    <Menu.Item>
                      <Accordion.Title
                        active={activeIndex === 1}
                        content={
                          Object.keys(tagSelection).length === 0 &&
                          workloads.length > 0 ? (
                            <span>
                              Tag Filters&nbsp;
                              <Icon name="spinner" loading />{' '}
                            </span>
                          ) : (
                            'Tag Filters'
                          )
                        }
                        index={1}
                        onClick={this.handleClick}
                        style={{ paddingTop: '0px', paddingBottom: '0px' }}
                      />
                      <Accordion.Content
                        active={activeIndex === 1}
                        content={<Tags />}
                      />
                    </Menu.Item>
                  </Accordion>

                  {menuItem('Migration', 'migrationOverview', 'cloud upload')}
                  {menuItem('Cost Analysis', 'costAnalysis', 'chart line')}
                </Menu.Menu>
              </Menu.Item>

              {selectedMigration ? (
                <>
                  <Menu.Item>
                    <Menu.Header
                      onClick={() =>
                        updateDataContextState({
                          selectedMigration: null,
                          selectedPage: 'migrationOverview'
                        })
                      }
                      style={{
                        cursor: 'pointer',
                        paddingBottom: '5px'
                      }}
                    >
                      <div
                        style={{
                          width: '150px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          float: 'left'
                        }}
                      >
                        {selectedMigration.label}
                      </div>
                      <Icon name="close" style={{ float: 'right' }} />
                    </Menu.Header>
                  </Menu.Item>
                  <Menu.Item style={{ paddingLeft: '25px' }}>
                    <Menu.Header>Plan</Menu.Header>
                    <Menu.Menu>
                      {menuItem(
                        'Workload Overview',
                        'workloadOverview',
                        'tasks'
                      )}
                    </Menu.Menu>
                  </Menu.Item>

                  <Menu.Item style={{ paddingLeft: '25px' }}>
                    <Menu.Header>Migrate</Menu.Header>
                    <Menu.Menu>
                      {menuItem(
                        'Migration Tracker',
                        'migrationTracker',
                        'compass'
                      )}
                      {menuItem(
                        'Migration Performance',
                        'migrationPerformance',
                        'tachometer alternate'
                      )}
                    </Menu.Menu>
                  </Menu.Item>

                  <Menu.Item style={{ paddingLeft: '25px' }}>
                    <Menu.Header>Run</Menu.Header>
                    <Menu.Menu>
                      {menuItem(
                        'Cloud Optimization',
                        'Install Cloud Optimize from the App Catalog.',
                        'cloud'
                      )}
                      {menuItem('Tag Compliance', 'tagCompliance', 'tags')}
                    </Menu.Menu>
                  </Menu.Item>
                </>
              ) : (
                ''
              )}
            </Menu>
          );
        }}
      </DataConsumer>
    );
  }
}
