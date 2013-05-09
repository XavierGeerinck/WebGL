window.onload = function() {
    WebGL.init();
};

var WebGL = {
    canvas: document.getElementById("canvas"),

    init: function() {
        WebGL.initGL(WebGL.canvas);
        WebGL.initShaders();
        WebGL.initBuffers();

        // clear canvas and make it black.
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Do depth test to make sure that things drawn in front of objects are hiding the ones behind them.
        gl.enable(gl.DEPTH_TEST);

        WebGL.drawScene();
    },

    drawScene: function() {

    },

    initGL: function() {

    },

    initShaders: function() {

    },

    /**
     * Buffers hold the details of the triangle and the square
     */
    initBuffers: function() {

    }
}