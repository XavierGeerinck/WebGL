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
        /*
         Process the loading and the progressing of the shaders.
         1) Check if they exist.
         2) Load them 1 by one
         3) Compile them and attach them to the central shader program
         4) Link the 2 shaders together
         5) Store them for later use

         Note: Texture should have byte sizes: 2x2 4x4, 16x16, 32x32
         */
        var FShader = document.getElementById(FSID);
        var VShader = document.getElementById(VSID);

        if (!FShader || !VShader)
            alert("Error, Could Not Find Shaders");
        else
        {
            // Load and Compile the Fragment Shader
            var Code = LoadShader(FShader);
            FShader = this.GL.createShader(this.GL.FRAGMENT_SHADER);
            this.GL.shaderSource(FShader, Code);
            this.GL.compileShader(FShader);

            // Load and Compile the Vertex Shader
            Code = LoadShader(VShader);
            VShader = this.GL.createShader(this.GL.VERTEX_SHADER);
            this.GL.shaderSource(VShader, Code);
            this.GL.compileShader(VShader);

            // Create the Shader program
            this.ShaderProgram = this.GL.createProgram();
            this.GL.attachShader(this.ShaderProgram, FShader);
            this.GL.attachShader(this.ShaderProgram, VShader);
            this.GL.linkProgram(this.ShaderProgram);
            this.GL.useProgram(this.ShaderProgram);

            // Link Vertex position attribute from shader
            this.VertexPosition = this.GL.getAttribLocation(this.ShaderProgram, "VertexPosition");
            this.GL.enableVertexAttribArray(this.VertexPosition);

            // Link Texture Coordinate Attribute from Shader
            this.VertexTexture = this.GL.getAttribLocation(this.ShaderProgram, "TextureCoord");
            this.GL.enableVertexAttribArray(this.VertexTexture);
        }

        this.Draw = function(Object, Texture)
        {
            var VertexBuffer = this.GL.createBuffer(); //Create a New Buffer

            //Bind it as The Current Buffer
            this.GL.bindBuffer(this.GL.ARRAY_BUFFER, VertexBuffer);

            // Fill it With the Data
            this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(Object.Vertices), this.GL.STATIC_DRAW);

            //Connect Buffer To Shader's attribute
            this.GL.vertexAttribPointer(this.VertexPosition, 3, this.GL.FLOAT, false, 0, 0);

            //Repeat For The next Two
            var TextureBuffer = this.GL.createBuffer();
            this.GL.bindBuffer(this.GL.ARRAY_BUFFER, TextureBuffer);
            this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(Object.Texture), this.GL.STATIC_DRAW);
            this.GL.vertexAttribPointer(this.VertexTexture, 2, this.GL.FLOAT, false, 0, 0);

            var TriangleBuffer = this.GL.createBuffer();
            this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, TriangleBuffer);
            this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(Object.Triangles), this.GL.STATIC_DRAW);

            //Generate The Perspective Matrix
            var PerspectiveMatrix = MakePerspective(45, this.AspectRatio, 1, 10000.0);

            var TransformMatrix = MakeTransform(Object);

            //Set slot 0 as the active Texture
            this.GL.activeTexture(this.GL.TEXTURE0);

            //Load in the Texture To Memory
            this.GL.bindTexture(this.GL.TEXTURE_2D, Texture);

            //Update The Texture Sampler in the fragment shader to use slot 0
            this.GL.uniform1i(this.GL.getUniformLocation(this.ShaderProgram, "uSampler"), 0);

            //Set The Perspective and Transformation Matrices
            var pmatrix = this.GL.getUniformLocation(this.ShaderProgram, "PerspectiveMatrix");
            this.GL.uniformMatrix4fv(pmatrix, false, new Float32Array(PerspectiveMatrix));

            var tmatrix = this.GL.getUniformLocation(this.ShaderProgram, "TransformationMatrix");
            this.GL.uniformMatrix4fv(tmatrix, false, new Float32Array(TransformMatrix));

            //Draw The Triangles
            this.GL.drawElements(this.GL.TRIANGLES, Object.Triangles.length, this.GL.UNSIGNED_SHORT, 0);
        };

        /*
         Convert image into WebGL texture
         This function will take care of converting the image

         Note: Image have to be in byte dimensiones: 2x2, 4x4, 8x8, 16x16, 32x32, 64x64, ...
         The Y coordinates flipping is added because sometimes you got the Y at the top left, and sometimes at the bottom left.
         The scaling will just tell WebGL how to scale up and down.
         */
        this.LoadTexture = function(Img){
            //Create a new Texture and Assign it as the active one
            var TempTex = this.GL.createTexture();
            this.GL.bindTexture(this.GL.TEXTURE_2D, TempTex);
            this.GL.pixelStorei(this.GL.UNPACK_FLIP_Y_WEBGL, true);
            //Load in The Image
            this.GL.texImage2D(this.GL.TEXTURE_2D, 0, this.GL.RGBA, this.GL.RGBA, this.GL.UNSIGNED_BYTE, Img);

            //Setup Scaling properties
            this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_MAG_FILTER, this.GL.LINEAR);
            this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_MIN_FILTER, this.GL.LINEAR_MIPMAP_NEAREST);
            this.GL.generateMipmap(this.GL.TEXTURE_2D);

            //Unbind the texture and return it.
            this.GL.bindTexture(this.GL.TEXTURE_2D, null);
            return TempTex;
        };
    }
}

/*
 For every child in the given Script loop through them and check if it's a text node, if it is then append that to the Code.
 */
LoadShader = function(Script) {
    var Code = "";
    var CurrentChild = Script.firstChild;
    while (CurrentChild)
    {
        if (CurrentChild.nodeType == CurrentChild.TEXT_NODE)
            Code += CurrentChild.textContent;

        CurrentChild = CurrentChild.nextSibling;
    }

    return Code;
};

/*
 The perspective matrix will edit the 3D world like the field of view and the visible objects

 Accepts the vertical field of view, the aspect ratio and the nearest and furthest points as arguments
 Anything closer than 1 unit and further then 10000 units will not be displayed.
 */
MakePerspective = function(FOV, AspectRatio, Closest, Farest) {
    var YLimit = Closest * Math.tan(FOV * Math.PI / 360);
    var A = -( Farest + Closest ) / ( Farest - Closest );
    var B = -2 * Farest * Closest / ( Farest - Closest );
    var C = (2 * Closest) / ( (YLimit * AspectRatio) * 2 );
    var D = (2 * Closest) / ( YLimit * 2 );

    return [
        C, 0, 0, 0,
        0, D, 0, 0,
        0, 0, A, -1,
        0, 0, B, 0
    ];
};

/*
 The transform matrix will edit the individual objects like the rotation, scale and position.
 */
MakeTransform = function(Object){
    var y = Object.Rotation * (Math.PI / 180.0);
    var A = Math.cos(y);
    var B = -1 * Math.sin(y);
    var C = Math.sin(y);
    var D = Math.cos(y);
    Object.Rotation += .3;
    return [
        A, 0, B, 0,
        0, 1, 0, 0,
        C, 0, D, 0,
        0, 0, -6, 1
    ];
};


/*
    This variable is created by the .obj importer, we do not wish to manually make those!
    //Todo make own .obj importer, optimise it as much as possible and documentate it well
*/
var Cube = {
    Rotation: 0,
    Vertices : [ // X, Y, Z Coordinates

        //Front

        1.0,  1.0,  -1.0,
        1.0, -1.0,  -1.0,
        -1.0,  1.0,  -1.0,
        -1.0, -1.0,  -1.0,

        //Back

        1.0,  1.0,  1.0,
        1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,

        //Right

        1.0,  1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0, -1.0,
        1.0, -1.0, -1.0,

        //Left

        -1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,

        //Top

        1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,
        1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0,

        //Bottom

        1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0

    ],
    Triangles : [ // Also in groups of threes to define the three points of each triangle
        //The numbers here are the index numbers in the vertex array

        //Front

        0, 1, 2,
        1, 2, 3,

        //Back

        4, 5, 6,
        5, 6, 7,

        //Right

        8, 9, 10,
        9, 10, 11,

        //Left

        12, 13, 14,
        13, 14, 15,

        //Top

        16, 17, 18,
        17, 18, 19,

        //Bottom

        20, 21, 22,
        21, 22, 23

    ],
    Texture : [ //This array is in groups of two, the x and y coordinates (a.k.a U,V) in the texture
        //The numbers go from 0.0 to 1.0, One pair for each vertex

        //Front

        1.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 0.0,


        //Back

        0.0, 1.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0,

        //Right

        1.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 0.0,

        //Left

        0.0, 1.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0,

        //Top

        1.0, 0.0,
        1.0, 1.0,
        0.0, 0.0,
        0.0, 1.0,

        //Bottom

        0.0, 0.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
    ]
};