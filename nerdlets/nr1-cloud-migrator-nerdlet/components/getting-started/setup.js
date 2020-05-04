import React from 'react';
import { DataConsumer } from '../../context/data';
import {
  Dropdown,
  Grid,
  Header,
  Message,
  Card,
  Image,
  Divider,
  Icon
} from 'semantic-ui-react';
import { navigation } from 'nr1';
import awsLogo from '../../images/aws-logo.png';
import azureLogo from '../../images/azure-logo-2.png';
import gcpLogo from '../../images/gcp-logo.png';
import vmwareLogo from '../../images/vmware-logo-2.png';
import nrinfraLogo from '../../images/nr-infra-logo.png';

export default class Setup extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { selectedAccount: null };
  }

  render() {
    const { selectedAccount } = this.state;

    return (
      <DataConsumer>
        {({ accounts }) => {
          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3">Setup</Header>
                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header style={{ paddingBottom: '5px' }}>
                      Install the relevant integrations for your environment(s).
                    </Message.Header>
                    <Message.List style={{ paddingBottom: '15px' }}>
                      <Message.Item>
                        To determine cloud spend accurately, install the
                        required cloud based integrations.
                      </Message.Item>
                      <Message.Item>
                        For in-depth visibility install the Infrastructure Agent
                        directly on your hosts.
                      </Message.Item>
                    </Message.List>
                    {/* </Message>

                  <Message floating style={{ borderRadius: 0 }}> */}
                    <Message.Header style={{ paddingBottom: '5px' }}>
                      Select your target New Relic account to continue setup.
                    </Message.Header>
                    <Message.List>
                      <Dropdown
                        className="singledrop"
                        placeholder="Select Account"
                        search
                        selection
                        options={accountOptions}
                        onChange={(e, d) =>
                          this.setState({ selectedAccount: d })
                        }
                      />
                    </Message.List>
                  </Message>

                  <div
                    style={{
                      display: selectedAccount ? '' : 'none'
                    }}
                  >
                    <Divider />

                    <Message floating style={{ borderRadius: 0 }}>
                      <Message.Header>In Cloud</Message.Header>
                      <Message.List>
                        <Message.Item>
                          Install both the Infrastructure Agent onto your
                          instances and setup the relevant cloud integration(s).
                        </Message.Item>
                        <Message.Item>
                          Consider baking the agent into your base image or into
                          your deployment pipelines.
                        </Message.Item>
                      </Message.List>
                    </Message>

                    <Card.Group>
                      <Card>
                        <Image
                          src={nrinfraLogo}
                          wrapped
                          ui={false}
                          style={{
                            paddingLeft: '2%',
                            paddingRight: '2%',
                            paddingTop: '25%',
                            height: '200px',
                            cursor: 'pointer'
                          }}
                          onClick={() =>
                            navigation.openStackedNerdlet({
                              id: 'link-wrapper',
                              urlState: {
                                url: `https://infrastructure.newrelic.com/accounts/${selectedAccount.value}/install`
                              }
                            })
                          }
                        />
                        <Card.Content>
                          <Card.Header style={{ textAlign: 'center' }}>
                            Infrastructure Agent - On Host
                          </Card.Header>
                        </Card.Content>
                      </Card>

                      <Icon
                        name="plus"
                        style={{ padding: '40px', paddingTop: '130px' }}
                      />

                      <Card>
                        <Image
                          src={awsLogo}
                          wrapped
                          ui={false}
                          style={{
                            padding: '10%',
                            height: '200px',
                            cursor: 'pointer'
                          }}
                          onClick={() =>
                            navigation.openStackedNerdlet({
                              id: 'link-wrapper',
                              urlState: {
                                url: `https://infrastructure.newrelic.com/accounts/${selectedAccount.value}/integrations/aws`
                              }
                            })
                          }
                        />
                        <Card.Content>
                          <Card.Header style={{ textAlign: 'center' }}>
                            AWS EC2 Integration
                          </Card.Header>
                        </Card.Content>
                      </Card>
                      <Card>
                        <Image
                          src={azureLogo}
                          wrapped
                          ui={false}
                          style={{
                            padding: '10%',
                            height: '200px',
                            cursor: 'pointer'
                          }}
                          onClick={() =>
                            navigation.openStackedNerdlet({
                              id: 'link-wrapper',
                              urlState: {
                                url: `https://infrastructure.newrelic.com/accounts/${selectedAccount.value}/integrations/azure`
                              }
                            })
                          }
                        />
                        <Card.Content>
                          <Card.Header style={{ textAlign: 'center' }}>
                            Azure VMs Integration
                          </Card.Header>
                        </Card.Content>
                      </Card>
                      <Card>
                        <Image
                          src={gcpLogo}
                          wrapped
                          ui={false}
                          style={{
                            padding: '10%',
                            height: '200px',
                            cursor: 'pointer'
                          }}
                          onClick={() =>
                            navigation.openStackedNerdlet({
                              id: 'link-wrapper',
                              urlState: {
                                url: `https://infrastructure.newrelic.com/accounts/${selectedAccount.value}/integrations/gcp`
                              }
                            })
                          }
                        />
                        <Card.Content>
                          <Card.Header style={{ textAlign: 'center' }}>
                            Google Compute Integration
                          </Card.Header>
                        </Card.Content>
                      </Card>
                    </Card.Group>

                    <br />

                    <Divider />

                    <Message floating style={{ borderRadius: 0 }}>
                      <Message.Header>On Premise</Message.Header>
                      <Message.List>
                        <Message.Item>
                          The VMware integration will collect all the resources
                          such as VMs, Hosts, Datastores etc. per vCenter or
                          ESXi host from a single integration.
                        </Message.Item>
                        <Message.Item>
                          Installing the Infrastructure Agent directly onto your
                          hosts will provide deep visibility into data such as
                          processes, inventory, applications (with APM) etc.
                          This is a minimum requirement for non VMware
                          environments.
                        </Message.Item>
                      </Message.List>
                    </Message>

                    <Card.Group>
                      <Card>
                        <Image
                          src={nrinfraLogo}
                          wrapped
                          ui={false}
                          style={{
                            paddingLeft: '2%',
                            paddingRight: '2%',
                            paddingTop: '25%',
                            height: '200px',
                            cursor: 'pointer'
                          }}
                          onClick={() =>
                            navigation.openStackedNerdlet({
                              id: 'link-wrapper',
                              urlState: {
                                url: `https://infrastructure.newrelic.com/accounts/${selectedAccount.value}/install`
                              }
                            })
                          }
                        />

                        <Card.Content>
                          <Card.Header style={{ textAlign: 'center' }}>
                            Infrastructure Agent - On Host
                          </Card.Header>
                        </Card.Content>
                      </Card>

                      <Icon
                        name="plus"
                        style={{ padding: '40px', paddingTop: '130px' }}
                      />

                      <Card>
                        <Image
                          src={vmwareLogo}
                          wrapped
                          ui={false}
                          style={{
                            paddingLeft: '10%',
                            paddingRight: '10%',
                            paddingTop: '30%',
                            height: '200px',
                            cursor: 'pointer'
                          }}
                          onClick={() =>
                            navigation.openStackedNerdlet({
                              id: 'vmware-setup',
                              urlState: {
                                accountId: selectedAccount.value
                              }
                            })
                          }
                        />
                        <Card.Content>
                          <Card.Header style={{ textAlign: 'center' }}>
                            ESXi / vCenter Integration
                          </Card.Header>
                        </Card.Content>
                      </Card>
                    </Card.Group>
                  </div>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
