# gerrit-label

Annotate Gerrit changes with labels based on content.

## Install

  ```$ npm install --save gerrit-label```

## Demo

  ```$ npm run run```

... produces a output similar to this (see configuration below regarding the configuration used in this example)

```
git-repo - Fix checkout error when depth option is used and revision is a sha1 [python, commit-message]
git-repo - Add review-project attribute to remote [python, commit-message]
git-repo - Increased functionality of review URL to better reflect fetch usage [python, commit-message]
git-repo - repo: add support to append path from remote [python, commit-message]
git-repo - Support repo-level post-sync hook. [python, commit-message]
git-repo - project: introduce hasCommit method [python, commit-message]
git-repo - sync: add a quick flag to ignore up to date projects [python, commit-message]
git-repo - project: GetSubmodules uses recursive switch for ls-tree [python, commit-message]
git-repo - manifest_xml: move path parsing before revision parsing [python, commit-message]
git-repo - Add a superproject metarepository for atomic syncs [python, commit-message]
git-repo - Forall: print error projects message [python, commit-message]
git-repo - Fix removing broken symlink in reference dir [python, commit-message]
```

## Configuration

The configuration is expected to be on the following format

```
{
  "queryString": "status:open",
  "endpoint": "https://gerrit-review.googlesource.com/changes/",
  "labelMap": {
    "git-repo": { // project
      "python": [".*\\.py"], // label and patterns
      "commit-message": ["COMMIT_MSG"] // label and patterns
    }
  }

}
```

... where `endpoint` is a Gerrit REST API endpoint from which the changes are to be fetched, `queryString` is a search options (See Gerrit REST API documentation) and
the `labelMap` is a map which for each provided project, a set of labels and patterns are defined.
The patterns will be used to match against the path and file name of the files modified in the change,
if a pattern for a specific label matches a change, then this changes will have this label in the result returned.

## License

Created by Karl Larsaeus, <karl@ninjacontrol.com> under MIT License.
