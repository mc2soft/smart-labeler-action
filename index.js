const core = require("@actions/core");
const github = require("@actions/github");

async function run(octokit) {
  const {
    pull_request: { title, body, number: prNumber },
  } = github.context.payload;
  const { owner, repo } = github.context.repo;

  const issueMatch = body.match(/#(\d+)/);
  const featLabelMatch = title.match(/\/(\w+)/);
  const typeLabelMatch = title.match(/(\w+)\(/);

  const noRelatedIssue = !issueMatch || issueMatch.length <= 1;
  const noFeat = !featLabelMatch || featLabelMatch.length <= 1;
  const noType = !typeLabelMatch || typeLabelMatch.length <= 1;

  if (noRelatedIssue && noFeat && noType) {
    throw new Error(
      "Startin 'self-distructing... I can not find source for picking label"
    );
  }

  const issueNumber = noRelatedIssue ? null : issueMatch[1];
  const featLabelName = noFeat ? null : featLabelMatch[1];
  const typeLabelName = noType ? null : typeLabelMatch[1];

  let labels = [];

  if (issueNumber) {
    const { data: issue } = await octokit.rest.issues.get({
      issue_number: issueNumber,
      owner,
      repo,
    });

    labels = [...labels, ...issue.labels];
  }

  const { data: repositoryLabels } = await octokit.request(
    "GET /repos/{owner}/{repo}/labels",
    {
      owner,
      repo,
    }
  );

  console.log(repositoryLabels);

  const parsedLabels = repositoryLabels.filter((label) => {
    const formattedFeat = featLabelName.split("-").join(" ");
    return (
      label.name.includes(formattedFeat) || label.name.includes(typeLabelName)
    );
  });

  if (!parsedLabels.length && !labels.length) {
    throw new Error("Labels not found");
  }

  return await client.rest.issues.addLabels({
    owner,
    repo,
    issue_number: prNumber,
    labels: [...labels, ...parsedLabels],
  });
}

async function main() {
  try {
    const octokit = github.getOctokit(core.getInput("github-token"));
    const {
      data: { labels },
    } = await run(octokit);
  } catch (error) {
    core.setFailed(error.message);
  }
}
main();
