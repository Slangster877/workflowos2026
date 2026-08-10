import { WorkflowUI } from "./WorkflowUI";

export function WorkflowPage({
  module,
  title,
  subtitle,
}: {
  module: string;
  title: string;
  subtitle: string;
}) {
  return <WorkflowUI module={module} title={title} subtitle={subtitle} />;
}
