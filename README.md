# WebRTC_For_UnityWeb
This is a test implementation of video chat using WebRTC with Unity's WebGL.
Only video communication is implemented; audio communication and DataChannel are not.

Unity version confirmed to work: 6.2

# Execution Steps
### 1. Clone the Repository
Clone the repository.  
### 2. Import TextMeshPro  
Open the cloned Unity project in Unity and import TextMeshPro, since it has not been pushed to the repository.  
### 3. Build and Run the Unity Project  
Change the build target to "Web".  
Click the [Build and Run] button.  
Once the web page appears, proceed to the next step.  
### 4. Start the Signaling Server  
The repository contains a "SampleSignalingServer" folder, which is a simple signaling server implemented for Node.js.  
 Start the signaling server with:
```
node signalingserver.js
```
### 5. TestWeb
The repository contains a "TestWeb" folder, which is a test web page for remote peers.  
Start a web server with the "TestWeb" folder as the document root, and access and view index.html in your browser.  
After viewing index.html in your browser, click the [Connect] button in index.html.  
### 6. Unity WebGL [Connect] Button  
Click the [Connect] button in index.html, then click the [Connect] button in Unity WebGL.  
This will initiate negotiation, and both parties' images will be displayed on the screen.  

# Known Issues
Also, the video sent from Unity is upside down, and in index.html it is displayed upside down using CSS style.  
This test project does not support perfect negotiation, so you must click the [Connect] button in index.html, then the Unity WebGL [Connect] button.  
