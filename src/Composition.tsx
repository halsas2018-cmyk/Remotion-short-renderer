import { CalculateMetadataFunction, Composition } from "remotion";

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

// This is a template file - replace with actual composition
// Example usage:
/*
export const MyComponent: React.FC<Props> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: "white", fontSize: 72 }}>Hello World</div>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={60}
      fps={30}
      width={1280}
      height={720}
      calculateMetadata={calculateMetadata}
    />
  );
};
*/

// Export empty to avoid registering a null component
export const MyComposition = null as any;
export const MyComponent = null as any;
