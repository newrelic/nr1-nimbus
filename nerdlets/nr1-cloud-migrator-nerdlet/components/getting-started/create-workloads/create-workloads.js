import React from 'react';
import { Grid, Header, Button, Divider, Message } from 'semantic-ui-react';
// import { DataConsumer } from '../../../context/data';
import { navigation } from 'nr1';
import DetectedWorkloads from './detected-workloads';

export default class CreateWorkloads extends React.PureComponent {
  render() {
    return (
      //   <DataConsumer>
      //     {({ bucketMs, updateDataContextState }) => (
      <Grid>
        <Grid.Row>
          <Grid.Column style={{ paddingTop: '15px' }}>
            <Header as="h3">Create Workloads</Header>

            <Message floating style={{ borderRadius: 0 }}>
              <Message.Header>
                Create workloads manually or from any automatically detected
                workload below.
              </Message.Header>
              <Message.List>
                <Message.Item>
                  Creating your own workload will leverage the New Relic
                  Workloads product interface.
                </Message.Item>
                <Message.Item>
                  Automatically detected workloads are determined based on
                  network information.
                </Message.Item>
                <Message.Item>
                  Read more about{' '}
                  <a
                    href="https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/new-relic-one-workloads-isolate-resolve-incidents-faster"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Workloads
                  </a>
                  .
                </Message.Item>
              </Message.List>
            </Message>

            <Divider />

            <Message floating style={{ borderRadius: 0 }}>
              <Message.Header>Create your own workload.</Message.Header>
              <Message.List>
                <Message.Item>
                  Detailed documentation on creating your own workloads outlined{' '}
                  <a
                    href="https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/new-relic-one-workloads-isolate-resolve-incidents-faster#create"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    here.
                  </a>
                </Message.Item>
                <Button
                  size="mini"
                  positive
                  circular
                  icon="hand point right outline"
                  content="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Start Here"
                  onClick={() =>
                    navigation.openStackedNerdlet({
                      id: 'link-wrapper',
                      urlState: {
                        url: 'https://one.newrelic.com/launcher/workloads.home'
                      }
                    })
                  }
                />
              </Message.List>
            </Message>

            <Divider />

            <DetectedWorkloads />
          </Grid.Column>
        </Grid.Row>
      </Grid>
      //     )}
      //   </DataConsumer>
    );
  }
}
