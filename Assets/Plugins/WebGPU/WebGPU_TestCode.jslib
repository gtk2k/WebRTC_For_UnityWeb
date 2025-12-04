var WebGpuTestCode = {
    $managedObjects: {
        cnv: null,
        ctx: null
    },

    InitCanvas: function(width, height) {
        var cnv = document.createElement('canvas');
        cnv.width = width;
        cnv.height = height;
        var ctx = cnv.getContext('2d');
        cnv.style.position = 'absolute';
        cnv.style.left = cnv.style.top = 0;
        document.documentElement.appendChild(managedObjects.cnv);
        managedObjects.cnv = cnv;
        managedObjects.ctx = ctx;
    },

    GetNativePixcelData: function (width, height, texPtr) {
        var texture = Module.WebGPU.device.derivedObjects.get(texPtr);
        var device = Module.WebGPU.device;
        var commandEncoder = device.createCommandEncoder();
        var buffer = device.createBuffer({
            size: w * h * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        commandEncoder.copyTextureToBuffer(
            { texture },
            { buffer },
            { width, height }
        );
        device.queue.submit([commandEncoder.finish()]);
        buffer.mapAsync(GPUMapMode.READ).then(function () {
            var arrayBuffer = buffer.getMappedRange();
            imageData.data.set(arrayBuffer);
            managedObjects.ctx.putImageData(imageData, 0, 0);
            buffer.unmap();
            buffer.destroy();
            arrayBuffer = null;
            console.log('=-== Local Render End: ', imageData.data);
        });
    }
};

autoAddDeps(WebGpuTestCode, '$managedObjects');
mergeInto(LibraryManager.library, WebGpuTestCode);