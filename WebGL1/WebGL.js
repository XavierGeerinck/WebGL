function WebGL(CID, FSID, VSID) {
    var canvas = document.getElementById(CID);
    if (!canvas.getContext("webgl") && !canvas.getContext("experimental-webgl"))
        alert("Your Browser Doesn't Support WebGL");
    else
    {
        this.GL = (canvas.getContext("webgl")) ? canvas.getContext("webgl") : canvas.getContext("experimental-webgl");
        this.GL.clearColor(1.0, 1.0, 1.0, 1.0); // This is the color
        this.GL.enable(this.GL.DEPTH_TEST); // Enable Depth Testing
        this.GL.depthFunc(this.GL.LEQUAL); // Set perspective View
        this.AspectRatio = canvas.width / canvas.height;

        // Load shaders here.
    }
}