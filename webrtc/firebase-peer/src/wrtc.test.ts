import wrtc from "wrtc";

describe("wrtc", () => {
  it("contains WebRTC API", () => {
    expect(wrtc.RTCPeerConnection).toBeDefined();
    expect(wrtc.RTCSessionDescription).toBeDefined();
    expect(wrtc.RTCIceCandidate).toBeDefined();
  });
});
