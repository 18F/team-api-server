# team-api-server

Node.js server that listens for GitHub push webhooks with modifications to
a target file (typically `.about.yml`) and updates a destination repo with the contents of that file, renamed as `<project_name>.yml`.

## Running

### In development

1. Make a copy of `.env.sample` saved as `.env` and provide values for all the environment variables. Visit https://github.com/settings/tokens to generate an access token with 'repo' scope permissions.
1. `npm install` to install dependencies.
1. `npm run dev-start` to start an auto-restarting server.

You can run `node scripts/push_hook.js` to send a test payload to your running application.

Run `npm test` to run the test suite.

### In Production

Instead of using the `.env` file, you may specify normal environment variables:

```sh
export GITHUB_USER=<GitHub username>
export GITHUB_ACCESS_TOKEN=<GitHub access token with 'repo' scope>
export GITHUB_ORG=<GitHub organization name>
export DESTINATION_REPO=<GitHub organization name>
export DESTINATION_PATH=_data/projects
export DESTINATION_BRANCH=master
export TARGET_FILE=.about.yml
export PORT=6000
```

## Contributing

1. Fork the repo (or just clone it if you're an 18F team member)
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Make your changes and test them via `npm test`
4. Lint your changes
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
