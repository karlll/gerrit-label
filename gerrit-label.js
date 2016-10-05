let req = require("request");
let q = require("q");
let _ = require("lodash");

const DIVIDER = ")]}'\n";

/**
 * Get all changes
 * @param {String} endpoint the REST endpoint to get changes from
 * @param {Object} auth authentication object (should have keys 'password' and 'user')
 * @param {String} query query string (see Gerrit API documentation)
 * @return {*|promise} The changes
 */
function getAllChanges(endpoint, auth, query) {
  let deferred = q.defer();
  if (query) {
    endpoint = endpoint + "?q=" + query;
  }
  req(endpoint, getAuth(auth), (err, response, data) => {
    if (!err && _.startsWith(data, DIVIDER)) {
      deferred.resolve(JSON.parse(data.substring(DIVIDER.length)));
    } else {
      deferred.reject(err);
    }
  });
  return deferred.promise;
}

/**
 * Get authentication object
 * @param {object} auth object contatining user and password
 * @return {*} authentication object (empty if no auth==undefined)
 */
function getAuth(auth) {
  if (auth) {
    return {
      auth: {
        user: auth.user,
        pass: auth.password,
        sendImmediately: false
      }
    };
  }
  return {};
}
/**
 * Filter changes based on projects
 * @param {Array} changes The changes
 * @param {Array} projectList A list of projects to be included
 * @return {Array} The resulting list
 */
function filterProjects(changes, projectList) {
  return _.filter(changes, item => {
    return (_.includes(projectList, item.project));
  });
}

/**
 * Get files for a given change and revision
 * @param {String} endpoint the REST endpoint to get changes from
 * @param {Object} auth authentication object (should have keys 'password' and 'user')
 * @param {String} changeId the change id
 * @param {String} revisionId The revision (defaults to 'current')
 * @return {*|promise} The files
 */
function getFiles(endpoint, auth, changeId, revisionId = "current") {
  let endp = `${endpoint}/${changeId}/revisions/${revisionId}/files/`;
  let deferred = q.defer();
  req(endp, getAuth(auth), (err, response, data) => {
    if (!err && _.startsWith(data, DIVIDER)) {
      deferred.resolve(JSON.parse(data.substring(DIVIDER.length)));
    } else {
      deferred.reject(err);
    }
  });
  return deferred.promise;
}
/**
 * Get changes and files
 * @param {Array} projectFilter list of project names
 * @param {String} endpoint the REST endpoint to get changes from
 * @param {Object} auth authentication object (should have keys 'password' and 'user')
 * @param {String} query query string (see Gerrit API documentation)
 * @return {*|promise} the changes and files
 */
function getChangesAndFiles(projectFilter, endpoint, auth, query) {
  let deferred = q.defer();
  getAllChanges(endpoint, auth, query).then(
    data => {
      try {
        let filteredChanges = filterProjects(data, projectFilter);

        let files = {};
        let fileReqs = [];

        _.forEach(filteredChanges, change => {
          fileReqs.push(getFiles(endpoint, auth, change.id).then(
            fileList => {
              files[change.id] = fileList;
            })
            .catch(
              err => {
                deferred.reject(err);
              }));
        });
        // wait for all requests to be finished
        q.all(fileReqs).then(_d => {
          let merged = {};
          _.forEach(filteredChanges, change => {
            merged[change.id] = change;
            merged[change.id].files = files[change.id];
          });
          deferred.resolve(merged);
        });
      } catch (err) {
        deferred.reject(err);
      }
    });
  return deferred.promise;
}

/**
 * Add labels to changes based on provided mapping
 * @param {Array} changes the changes to which the labels should be added
 * @param {object} labelMap the label map
 * @return {object} the changes with added labels
 */
function addLabels(changes, labelMap) {
  let result = {};
  _.forEach(changes, (change, id) => {
    result[id] = Object.assign(change, {labels: getLabels(change, labelMap)});
  });
  return result;
}

/**
 * Get labels for changes
 * @param {object} change the change to get the labels for
 * @param {object} labelMap the label map
 * @return {Array} the labels
 */
function getLabels(change, labelMap) {
  let labelSet = new Set();
  // is the change's project included in the map?
  if (_.includes(_.keys(labelMap), change.project)) {
    let _labels = _.keys(labelMap[change.project]);
    // In the labelMap; all labels defined in the change's project
    _.forEach(_labels, d => {
      let rx = labelMap[change.project][d].join("|");
      const r = new RegExp(rx);
      _.forEach(_.keys(change.files), file => {
        if (r.test(file)) {
          labelSet.add(d);
        }
      });
    });
  }
  return Array.from(labelSet);
}
/**
 * @callback processChange
 * @param {object} A change
 * Example of change object structure:
 * { id: 'git-repo~master~Iae923ba2ef0ba5a8dc1b8e42d8cc3f3708f773af',
 *  project: 'git-repo',
 *  branch: 'master',
 *  hashtags: [],
 *  change_id: 'Iae923ba2ef0ba5a8dc1b8e42d8cc3f3708f773af',
 *  subject: 'Fix removing broken symlink in reference dir',
 *  status: 'NEW',
 *  created: '2015-07-06 15:24:02.000000000',
 *  updated: '2016-06-29 05:44:20.000000000',
 *  submit_type: 'MERGE_IF_NECESSARY',
 *  mergeable: true,
 *  insertions: 8,
 *  deletions: 7,
 *  _number: 69344,
 *  owner: { _account_id: 1020772 },
 *  files: { '/COMMIT_MSG': [Object], 'project.py': [Object] },
 *  labels: [ 'domain1', 'domain2' ] } }
 */

/**
 * Get labeled changes
 * @param {object} config configuration containing the REST endpoint for getting changes, and the label map.
 * @param {processChange} callback this function will be invoked with each change
 * @param {object} auth authentication object (should have keys 'password' and 'user')
 *
 */
function getChanges(config, callback, auth) {
  getChangesAndFiles(_.keys(config.labelMap), config.endpoint, auth, config.queryString)
    .then(cf => {
      let changes = addLabels(cf, config.labelMap);
      _.forEach(changes, change => callback(change));
    });
}

module.exports = getChanges;
