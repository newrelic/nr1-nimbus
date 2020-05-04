import React from 'react';
import { NerdletStateContext, NerdGraphQuery, NerdGraphMutation } from 'nr1';
import { ToastContainer, toast } from 'react-toastify';
import {
  workloadsQuery,
  createWorkloadDatacenter
} from '../shared/lib/queries';
import {
  Grid,
  Header,
  Message,
  Button,
  Form,
  Checkbox,
  Segment
} from 'semantic-ui-react';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-monokai';

toast.configure();

export default class VMwareSetup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showConfig: false,
      loc: '',
      user: '',
      pass: '',
      url: '',
      ssl: false,
      configFile: ''
    };
  }

  generateConfig = () => {
    const { loc, user, pass, url, ssl } = this.state;
    this.setState({
      configFile: `integrations:
  - name: nri-vsphere
    exec:
      - /var/db/newrelic-infra/newrelic-integrations/bin/nri-vsphere
      - --datacenter_location
      - ${loc}
      - --user
      - ${user}
      - --pass
      - ${pass}
      - --url
      - ${url}
      ${ssl ? '- --validate_ssl' : ''}
  `
    });
  };

  clearConfig = () => {
    this.setState({
      showConfig: false,
      loc: '',
      user: '',
      pass: '',
      url: '',
      ssl: true,
      configFile: '',
      datacenterGuid: ''
    });
  };

  createDatacenter = async (accountId, loc) => {
    const workloadsQueryResult = await NerdGraphQuery.query({
      query: workloadsQuery(accountId)
    });

    const workloadsResult =
      (
        ((((workloadsQueryResult || {}).data || {}).actor || {}).account || {})
          .workload || {}
      ).collections || null;

    if (workloadsResult) {
      let datacenterGuid = '';
      for (let z = 0; z < workloadsResult.length; z++) {
        if (
          workloadsResult[z].name
            .toLowerCase()
            .includes(`Datacenter: ${loc}`.toLowerCase())
        ) {
          this.setState({ datacenterGuid: workloadsResult[z].guid });
          datacenterGuid = workloadsResult[z].guid;
          break;
        }
      }

      if (datacenterGuid === '') {
        const createDatacenterResult = await NerdGraphMutation.mutate({
          mutation: createWorkloadDatacenter(accountId, loc)
        });

        const result =
          ((createDatacenterResult || {}).data || {}).workloadCreate || null;

        if (result) {
          toast.success('Datacenter created.', {
            autoClose: 2500,
            containerId: 'B'
          });
          this.setState({ datacenterGuid: result.guid });
        }
      } else {
        toast.warn('Datacenter already exists.', {
          autoClose: 2500,
          containerId: 'B'
        });
      }
    } else {
      toast.error('Unable to get existing Datacenters.', {
        autoClose: 2500,
        containerId: 'B'
      });
    }
  };

  deleteDatacenter = async guid => {
    const deleteDatacenter = await NerdGraphMutation.mutate({
      mutation: `mutation {
        workloadDelete(guid: "${guid}") {
          name
        }
      }`
    });
    if (deleteDatacenter) {
      toast.warn('Deleted Datacenter location.', {
        autoClose: 5000,
        containerId: 'B'
      });
    }
    this.setState({ datacenterGuid: '' });
  };

  render() {
    const {
      showConfig,
      configFile,
      loc,
      user,
      pass,
      url,
      ssl,
      datacenterGuid
    } = this.state;
    let generateDisabled = false;
    if (url === '' || loc === '' || user === '' || pass === '') {
      generateDisabled = true;
    }

    return (
      <NerdletStateContext.Consumer>
        {nerdletState => {
          // window.location.replace(nerdletState.url)
          return (
            <Grid style={{ padding: '15px', paddingTop: '30px' }}>
              <ToastContainer
                enableMultiContainer
                containerId="B"
                position={toast.POSITION.TOP_RIGHT}
              />

              <Grid.Row>
                <Grid.Column>
                  <Header as="h3">Connect your VMware Environments</Header>
                  <Message style={{ fontSize: '14px' }}>
                    <Message.Header>Requirements</Message.Header>
                    <Message.List>
                      <Message.Item>
                        Ensure you have a Linux Virtual Machine available that
                        can access your target vCenter or ESXi host.
                      </Message.Item>
                      <Message.Item>
                        Install the Infrastructure Agent and confirm the agent
                        is reporting.
                      </Message.Item>
                      <Message.Item>
                        For details on what metrics are captured view the{' '}
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href="https://docs.newrelic.com/docs/integrations/host-integrations/host-integrations-list/vmware-vsphere-monitoring-integration"
                        >
                          documentation.
                        </a>
                      </Message.Item>
                    </Message.List>
                  </Message>
                  <Message style={{ fontSize: '14px' }}>
                    <Message.Header>
                      Install the VMware Integration
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        On your VM execute the following command:
                        <Segment>
                          <div
                            style={{ padding: '9px' }}
                          >{`sudo sh -c "cd /var/db/newrelic-infra/newrelic-integrations/bin/ && { curl -O https://nr1-cloud-migrator.s3.amazonaws.com/nri-vsphere ; chmod +x nri-vsphere ; cd -; }"`}</div>
                        </Segment>
                      </Message.Item>
                      <Message.Item>
                        Modify the below configuration file with your target
                        vCenter or ESXi details.
                      </Message.Item>
                      <Message.Item>
                        {' '}
                        Configuration File: vsphere-config.yml
                        <br /> <br />
                        <Form>
                          <Form.Field>
                            <input
                              value={loc}
                              placeholder="Datacenter Location"
                              onChange={e =>
                                this.setState({ loc: e.target.value })
                              }
                            />
                          </Form.Field>
                          <Form.Field>
                            <input
                              value={user}
                              placeholder="Username"
                              onChange={e =>
                                this.setState({ user: e.target.value })
                              }
                            />
                          </Form.Field>
                          <Form.Field>
                            <input
                              value={pass}
                              placeholder="Password"
                              onChange={e =>
                                this.setState({ pass: e.target.value })
                              }
                            />
                          </Form.Field>
                          <Form.Field>
                            <input
                              value={url}
                              placeholder="vCenter or VMware ESXi Host URL"
                              onChange={e =>
                                this.setState({ url: e.target.value })
                              }
                            />
                          </Form.Field>
                          <Form.Field>
                            <Checkbox
                              checked={ssl}
                              label="Validate SSL"
                              onChange={() => this.setState({ ssl: !ssl })}
                            />
                          </Form.Field>
                        </Form>
                        <br />
                        <Button
                          onClick={() => {
                            this.generateConfig();
                            this.setState({ showConfig: true });
                          }}
                          disabled={generateDisabled}
                          positive
                        >
                          Generate Configuration File
                        </Button>
                        <br /> <br />
                        <AceEditor
                          mode="yaml"
                          theme="monokai"
                          // onChange={onChange}
                          name="UNIQUE_ID_OF_DIV"
                          width="100%"
                          height="250px"
                          value={configFile}
                          readOnly
                          style={{ display: showConfig ? '' : 'none' }}
                          editorProps={{ $blockScrolling: true }}
                        />
                      </Message.Item>
                      <Message.Item
                        style={{ display: showConfig ? '' : 'none' }}
                      >
                        Copy the above "vmware-config.yml" into the
                        "/etc/newrelic-infra/integrations.d/" folder off your
                        VM.
                      </Message.Item>
                      <Message.Item
                        style={{ display: showConfig ? '' : 'none' }}
                      >
                        The Infrastructure Agent will automatically start
                        collecting data, no restarts are required.
                      </Message.Item>
                      <Button
                        style={{
                          display: showConfig ? '' : 'none',
                          width: '200px'
                        }}
                        positive
                        onClick={() =>
                          this.createDatacenter(nerdletState.accountId, loc)
                        }
                      >
                        Create VMware Datacenter
                      </Button>
                      <Button
                        negative
                        style={{
                          display: showConfig && datacenterGuid ? '' : 'none',
                          width: '200px'
                        }}
                        onClick={() => this.deleteDatacenter(datacenterGuid)}
                      >
                        Delete Datacenter
                      </Button>
                      <br /> <br />
                      <Button
                        style={{
                          display: showConfig ? '' : 'none',
                          width: '200px'
                        }}
                        positive
                        onClick={() => this.clearConfig()}
                      >
                        Add Another Environment
                      </Button>
                    </Message.List>
                  </Message>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </NerdletStateContext.Consumer>
    );
  }
}
