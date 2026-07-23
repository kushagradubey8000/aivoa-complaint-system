const nodes = [
  "classify_intent",
  "extract_fields",
  "merge_fields",
  "assess_risk",
  "compose_reply",
]

export default function LangGraphExecutionPanel({
  currentNode,
  completedNodes = [],
  executionTrace = [],
}) {

  const getDetails = (node) =>
    executionTrace.find(step => step.node === node)?.details
  const getSeverityClass = (severity) => {
      switch (severity?.toLowerCase()) {
        case "critical":
          return "badge-critical"
        case "major":
          return "badge-major"
        case "minor":
          return "badge-minor"
        default:
          return "badge-default"
      }
    }

  const getPriorityClass = (priority) => {
      switch (priority?.toLowerCase()) {
        case "high":
          return "badge-high"
        case "medium":
          return "badge-medium"
        case "low":
          return "badge-low"
        default:
          return "badge-default"
      }
    }
  return (
    <div className="graph-panel">
      <h3>🔄 LangGraph Execution</h3>

      {nodes.map((node) => {

        const completed = completedNodes.includes(node)
        const active = currentNode === node
        const details = getDetails(node)
        
        return (
          <div
            key={node}
            className={`graph-node ${
              completed
                ? "completed"
                : active
                ? "active"
                : ""
            }`}
          >
            <div>
              {completed ? "✅" : active ? "🟦" : "⚪"} <strong>{node}</strong>
            </div>

            {completed && details && (
              <div
                style={{
                  marginTop: 10,
                  marginLeft: 28,
                  fontSize: 12,
                  color: "#555",
                  lineHeight: "1.7",
                }}
              >

                {details.tool && (
                  <div>🔧 Tool: <b>{details.tool}</b></div>
                )}

                {details.count && (
                  <div>📄 Extracted {details.count} fields</div>
                )}

                {details.fields && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "8px",
                    }}
                  >
                    {details.fields.map((field) => (
                      <span
                        key={field}
                        className="field-chip"
                      >
                        ✓{" "}
                        {field
                          .replaceAll("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                )}

                {details.merged_count && (
                  <div>🔀 Merged {details.merged_count} fields</div>
                )}

                {details.severity && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>🚨 Severity</span>

                    <span className={`status-badge ${getSeverityClass(details.severity)}`}>
                      {details.severity}
                    </span>
                  </div>
                )}

                {details.priority && (
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>⚡ Priority</span>
                  
                    <span className={`status-badge ${getPriorityClass(details.priority)}`}>
                      {details.priority}
                    </span>
                  </div>
                )}

                {details.classification && (
                  <div>🏷 {details.classification}</div>
                )}

                {details.status && (
                  <div>💬 {details.status}</div>
                )}

              </div>
            )}

          </div>
        )
      })}
    </div>
  )
}