# team-api-server

[![Build Status](https://travis-ci.org/18F/team-api-server.svg?branch=master)](https://travis-ci.org/18F/team-api-server)

[![Code Climate](https://codeclimate.com/github/18F/team-api-server.png)](https://codeclimate.com/github/18F/team-api-server)

Node.js server that listens for GitHub push webhooks with modifications to
a target file (typically `.about.yml`) and updates a destination repo with the contents of that file, renamed as `<project_name>.yml`.

## Running

### In development

1. Make a copy of `.env.sample` saved as `.env` and provide values for all the environment variables. Visit https://github.com/settings/tokens to generate an access token with 'repo' scope permissions.
1. `npm install` to install dependencies.
1. `npm run dev-start` to start an auto-restarting server.

Run `npm test` to do a single run of the test suite.
Run `npm run dev-test` to run the test suite continuously as changes are made.

You can run `node scripts/push_hook.js` to send a test payload to your running application.

### In Production

Instead of using the `.env` file, you may specify normal environment variables:

```sh
export GITHUB_USER=<GitHub username>
export GITHUB_ACCESS_TOKEN=<GitHub access token with 'repo' scope>
export GITHUB_ORG=<GitHub organization name>
export DESTINATION_REPO=<GitHub organization name>

# The following variables have defaults as specified, so you only need to
# specify them if your values are different
export DESTINATION_PATH=_data/projects
export DESTINATION_BRANCH=master
export TARGET_FILE=.about.yml
export PORT=6000
```

### On Cloud.gov

For Cloud.gov deployments, this project makes use of a Custom User Provided Service (CUPS) to get its configuration variables instead of reading from a `.env` file or from the local environment.

You will need to create a CUPS, provide 'credentials' to it, and link it to the application instance.

Here is what you will probably need to do (assuming you have an application instance named `team-api-server`):

```sh
cf cups team-api-server-env -p "GITHUB_USER, GITHUB_ACCESS_TOKEN, GITHUB_ORG, DESTINATION_REPO"
# You will then be prompted to provide values for the listed credentials

cf bind-service team-api-server team-api-server-env
cf restage team-api-server
```


## Contributing

1. Fork the repo (or just clone it if you're an 18F team member)
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Make your changes and test them via `npm test`
4. Lint your changes with either `npm run lint` or the editor plugin of your choice. This project uses eslint.
5. Commit your changes (`git commit -am 'Add some feature'`)
6. Push to the branch (`git push origin my-new-feature`)
7. Create a new Pull Request

Feel free to [file an issue](https://github.com/18F/team-api-server/issues)
with any questions you may have, especially if the current documentation
should've addressed your needs, but didn't.

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in
[CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright
> and related rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication.
> By submitting a pull request, you are agreeing to comply with this waiver of
> copyright interest.
