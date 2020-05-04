import gql from 'graphql-tag';

// no need to run directly, nrdbQuery just passes it through
export const gqlNrqlQuery = (accountId, query, timeout) => gql`{
    actor {
      account(id: ${accountId}) {
        nrql(query: "${query}", timeout: ${timeout || 30000}) {
          results
        }
      }
    }
  }`;

export const workloadQueries = accountId => `{
    actor {
      account(id: ${accountId}) {
        workload {
          collections {
            entities {
              guid
            }
            permalink
            entitySearchQuery
            guid
            id
            name
            account {
              id
              name
            }
          }
        }
      }
    }
  }`;

export const fetchEntitiesInWorkload = (query, cursor) => `{
    actor {
      entitySearch(query: "${query}") {
        count
        results${cursor ? `(cursor: "${cursor}")` : ''} {
          entities {
            entityType
            guid
            name
            account {
              id
              name
            }
            ... on SyntheticMonitorEntityOutline {
              monitorId
            }
            ... on GenericInfrastructureEntityOutline {
              type
            }
          }
          nextCursor
        }
      }
    }
  }`;

export const workloadsQuery = accountId => `{
    actor {
      account(id: ${accountId}) {
        workload {
          collections {
            guid
            id
            name
            account {
              id
              name
            }
            entities {
              guid
            }
          }
        }
      }
    }
  }`;

const infraSystemSampleQuery = `FROM SystemSample SELECT \
                                      latest(timestamp), \
                                      latest(entityGuid), latest(apmApplicationNames), latest(providerAccountName), latest(hostname), latest(configName), \
                                      latest(awsRegion), latest(regionName), latest(zone), latest(ec2InstanceId), latest(ec2InstanceType), latest(instanceType),\
                                      latest(coreCount), latest(processorCount), latest(memoryTotalBytes), latest(diskTotalBytes), latest(operatingSystem), \
                                      max(cpuPercent), max(memoryUsedBytes), max(memoryUsedBytes/memoryTotalBytes)*100 as 'max.memoryPercent' LIMIT 1`;

// attributes are renamed to best match SystemSample to make computations simple
const infraVSphereVmQuery = `FROM VSphereVmSample SELECT \
                                    latest(timestamp), latest(entityGuid), latest(vmConfigName), latest(operatingSystem), latest(disk.totalMiB) * 1.049e+6 as 'latest.diskTotalBytes', \
                                    max(cpu.hostUsagePercent) as 'max.cpuPercent', max(mem.usage/mem.size) *100 as 'max.memoryPercent', \
                                    latest(cpu.cores) as 'latest.coreCount', latest(mem.size) * 1.049e+6 as 'latest.memoryTotalBytes' LIMIT 1`;

export const infraSampleBatchQuery = (guids, timePeriod) => `{
  actor {
    entities(guids: [${guids}]) {
      guid
      systemSample: nrdbQuery(nrql: "${infraSystemSampleQuery} ${timePeriod ||
  `SINCE 1 week ago`}", timeout: 10000) {
        results
      }
      networkSample: nrdbQuery(nrql: "SELECT * FROM NetworkSample LIMIT 1 ${timePeriod ||
        `SINCE 1 week ago`}", timeout: 10000) {
        results
      }
      vsphereVmSample: nrdbQuery(nrql: "${infraVSphereVmQuery} ${timePeriod ||
  `SINCE 1 week ago`}", timeout: 10000) {
              results
            }
      keyset: nrdbQuery(nrql: "SELECT keyset() FROM SystemSample LIMIT 1 ${timePeriod ||
        `SINCE 1 week ago`}", timeout: 10000) {
        results
      }
    }
  }
}`;

export const createWorkloadDatacenter = (accountId, dcLocation) => {
  return gql`mutation {
      workloadCreate(accountId: ${accountId}, workload: {entitySearchQueries: {name: "Datacenter Location", query: "(name like '${dcLocation}' or id = '${dcLocation}' or domainId = '${dcLocation}') and \`tags.accountId\` = '${accountId}'"}, name: "Datacenter: ${dcLocation}"}) {
        id
        name
        guid
      }
    }`;
};

export const createPostMigrationWorkload = (accountId, name, migrationId) => {
  return gql`mutation {
      workloadCreate(accountId: ${accountId}, workload: {entitySearchQueries: {query: "\`tags.label.MigrationId\` = '${migrationId}'"}, name: "${name} - MigrationId:${migrationId}"}) {
        id
        name
        guid
      }
    }`;
};

export const getTagsQuery = guid => `{
    actor {
      entity(guid: "${guid}") {
        ... on WorkloadEntity {
          guid
          name
          tags {
            key
            values
          }
        }
      }
    }
  }`;

export const deleteAllTagsQuery = guid => `mutation {
    taggingReplaceTagsOnEntity(guid: "${guid}", tags: {key: "", values: ""}) {
      errors {
        message
        type
      }
    }
  }`;

export const replaceAllTagsQuery = (guid, tags) => {
  let tagStr = '';
  tags.forEach(tag => (tagStr += `{key: "${tag.key}", values: "${tag.val}"},`));
  tagStr = tagStr.slice(0, -1);

  return gql`mutation {
    taggingReplaceTagsOnEntity(guid: "${guid}", tags: [${tagStr}]) {
      errors {
        message
        type
      }
    }
  }`;
};

export const addTags = (guid, tags) => {
  let tagStr = '';
  tags.forEach(tag => (tagStr += `{key: "${tag.key}", values: "${tag.val}"},`));
  tagStr = tagStr.slice(0, -1);

  return gql`mutation {
      taggingAddTagsToEntity(guid: "${guid}", tags: [${tagStr}]) {
        errors {
          message
          type
        }
      }
    }`;
};

export const deleteTags = (guid, tags) => {
  let tagStr = '';
  tags.forEach(tag => (tagStr += `"${tag}",`));
  tagStr = tagStr.slice(0, -1);

  return gql`mutation {
    taggingDeleteTagFromEntity(guid: "${guid}", tagKeys: [${tagStr}]) {
      errors {
        message
        type
      }
    }
  }
  `;
};
