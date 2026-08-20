"""Generates infra/prompthon-infra.png.

Optional dev tool, not part of the build:

    brew install graphviz
    python3 -m venv .venv && .venv/bin/pip install diagrams
    .venv/bin/python infra/diagram.py
"""

import importlib

from diagrams import Cluster, Diagram, Edge
from diagrams.generic.blank import Blank


def node(candidates, label):
    """First available icon class, else a labelled blank box.

    `diagrams` renames AWS classes between releases, so a hard import would break
    on upgrade. A blank box is a better failure mode than a stack trace.
    """
    for path in candidates:
        module_name, class_name = path.rsplit(".", 1)
        try:
            return getattr(importlib.import_module(module_name), class_name)(label)
        except Exception:
            continue
    return Blank(label)


with Diagram(
    "prompthon-runtime",
    filename="infra/prompthon-infra",
    outformat="png",
    show=False,
    direction="LR",
    graph_attr={"fontsize": "16", "bgcolor": "white", "pad": "0.4", "ranksep": "1.1"},
):
    user = node(["diagrams.onprem.client.Users", "diagrams.onprem.client.User"], "User")

    with Cluster("AWS Cloud  us-east-1"):
        # CDK has no icon of its own in this package; CloudFormation is what it drives.
        cdk = node(
            ["diagrams.aws.devtools.ToolsAndSdks", "diagrams.aws.management.Cloudformation"],
            "AWS CDK",
        )

        with Cluster("Default VPC"):
            with Cluster("Public subnet  us-east-1a"):
                ec2 = node(["diagrams.aws.compute.EC2"], "EC2\nagent backend")
            sg = node(
                ["diagrams.generic.network.Firewall"],
                "Security group\nno open port",
            )

        transcribe = node(
            ["diagrams.aws.ml.Transcribe"],
            "Amazon Transcribe\nvoice input path",
        )
        bedrock = node(
            ["diagrams.aws.ml.Bedrock", "diagrams.aws.ml.MachineLearning"],
            "Amazon Bedrock\nLLM API for the agent",
        )
        param = node(
            [
                "diagrams.aws.management.SystemsManagerParameterStore",
                "diagrams.aws.management.ParameterStore",
            ],
            "Parameter Store\nSecureString",
        )
        ddb = node(["diagrams.aws.database.Dynamodb"], "Amazon DynamoDB\nnot created")

    exaone = node(["diagrams.onprem.client.Client"], "K-EXAONE API\nskill discovery")

    user >> Edge(style="dashed", label="text / voice") >> ec2
    sg - Edge(style="dotted") - ec2

    ec2 >> Edge(label="voice to text") >> transcribe
    ec2 >> Edge(label="chat, tool calling") >> bedrock
    ec2 >> Edge(label="skill discovery") >> exaone
    ec2 << Edge(label="api key") << param
    ec2 >> Edge(style="dashed", color="grey") >> ddb
