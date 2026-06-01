export default function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#444",
          animation: "pulse 1.2s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
