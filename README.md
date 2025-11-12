# UnityWebGL_WebRTC_Test
This is a test implementation of video chat using WebRTC with Unity's WebGL.
Only video communication is implemented; audio communication and DataChannel are not.

# Execution Steps
### 1. Clone the Repository
Clone the repository.
### 2. Build and Run the Unity Project
Change the build target to "Web".
Click the [Build and Run] button.
Once the web page appears, proceed to the next step.
### 3. Start the Signaling Server
The repository contains a "SampleSignalingServer" folder, which is a simple signaling server implemented for Node.js.
 Start the signaling server with:
```
node signalingserver.js
```
### 4. TestWeb
The repository contains a "TestWeb" folder, which is a test web page for remote peers.
Start a web server with the "TestWeb" folder as the document root, and access and view index.html in your browser.
After viewing index.html in your browser, click the [Connect] button in index.html.
### 5. Unity WebGL [Connect] Button
Click the [Connect] button in index.html, then click the [Connect] button in Unity WebGL.
This will initiate negotiation, and both parties' images will be displayed on the screen.

# Known Issues
The Unity implementation uses Graphics.Blit(). Graphics.Blit() is deprecated in URP, so this repository's project does not support URP.
It may be possible to run it by replacing Graphics.Blit() with something that uses the RenderPass/Blitter API, but I don't currently have the skills to do so.
Also, the video sent from Unity is upside down, and in index.html it is displayed upside down using CSS style.
This test project does not support perfect negotiation, so you must click the [Connect] button in index.html, then the Unity WebGL [Connect] button.
