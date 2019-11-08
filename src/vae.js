// VAE in tensorflow.js
// based on https://github.com/songer1993/tfjs-vae

const Max = require('max-api');
const tf = require('@tensorflow/tfjs-node');

const utils = require('./utils.js')
const data = require('./data.js')

// Constants
const NUM_DRUM_CLASSES = require('./constants.js').NUM_DRUM_CLASSES;
const LOOP_DURATION = require('./constants.js').LOOP_DURATION;

const ORIGINAL_DIM = require('./constants.js').ORIGINAL_DIM;
const INTERMEDIATE_DIM = 512;
const LATENT_DIM = 2;

const BATCH_SIZE = 128;
const NUM_BATCH = 50;
const TEST_BATCH_SIZE = 1000;
const MSE_LOSS_COEF = 10.0;  // otherwise mseLoss is too small to affect the training process

let dataHandler; 
let dataHandlerTimeshift;
let model;
let numEpochs = 50;

async function loadAndTrain(train_data, train_data_timeshift) {
  dataHandler = new data.DataHandler(train_data); // data utility
  dataHandlerTimeshift = new data.DataHandler(train_data_timeshift); // data utility for timeshift data

  initModel(); // initializing model class
  startTraining(); // start the actual training process with the given training data
}

function initModel(){
  model = new ConditionalVAE({
    modelConfig:{
      originalDim: ORIGINAL_DIM,
      intermediateDim: INTERMEDIATE_DIM,
      latentDim: LATENT_DIM
    },
    trainConfig:{
      batchSize: 16,
      testBatchSize: TEST_BATCH_SIZE,
      // epochs: 50,
      optimizer: tf.train.adam(),
    //   logMessage: ui.logMessage,
    //   plotTrainLoss: ui.plotTrainLoss,
    //   plotValLoss: ui.plotValLoss,
    //   updateProgressBar: ui.updateProgressBar
    }
  });
}

async function startTraining(){
  await model.train();
}

function stopTraining(){
  model.shouldStopTraining = true;
  utils.log_status("Stopping training...");
}

function isTraining(){
  if (model && model.isTraining) return true;
}

function isReadyToGenerate(){
  return (model && model.isTrained);
}

function setEpochs(e){
  numEpochs = e;
  Max.outlet("epoch", 0, numEpochs);
}

function generatePattern(z1, z2){
  var zs;
  if (z1 === 'undefined' || z2 === 'undefined'){
    zs = tf.randomNormal([1, 2]);
  } else {
    zs = tf.tensor2d([[z1, z2]]);
  }
  return model.generate(zs);
}

async function saveModel(filepath){
  model.saveModel(filepath);
}

async function loadModel(filepath){
  if (!model) initModel();
  model.loadModel(filepath);
}

// Sampling Z 
class sampleLayer extends tf.layers.Layer {
  constructor(args) {
    super({});
  }

  computeOutputShape(inputShape) {
    return inputShape[0];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const [zMean, zLogVar] = inputs;
      const batch = zMean.shape[0];
      const dim = zMean.shape[1];
      const epsilon = tf.randomNormal([batch, dim]);
      const half = tf.scalar(0.5);
      const temp = zLogVar.mul(half).exp().mul(epsilon);
      const sample = zMean.add(temp);
      return sample;
    });
  }

  getClassName() {
    return 'sampleLayer';
  }
}

  
class ConditionalVAE {
  constructor(config) {
    this.modelConfig = config.modelConfig;
    this.trainConfig = config.trainConfig;
    [this.encoder, this.decoder, this.apply] = this.build();
    this.isTrained = false;
  }

  build(modelConfig) {
    if (modelConfig != undefined){
      this.modelConfig = modelConfig;
    }
    const config = this.modelConfig;

    const originalDim = config.originalDim;
    const intermediateDim = config.intermediateDim;
    const latentDim = config.latentDim;

    // VAE model = encoder + decoder
    // build encoder model

    // Velocity input
    const encoderInputs = tf.input({shape: [originalDim]});
    const x1Linear = tf.layers.dense({units: intermediateDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(encoderInputs);
    const x1Normalised = tf.layers.batchNormalization({axis: 1}).apply(x1Linear);
    const x1 = tf.layers.leakyReLU().apply(x1Normalised);

    // Timeshift input
    const encoderInputsTS= tf.input({shape: [originalDim]});
    const x1LinearTS = tf.layers.dense({units: intermediateDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(encoderInputsTS);
    const x1NormalisedTS = tf.layers.batchNormalization({axis: 1}).apply(x1LinearTS);
    const x1TS = tf.layers.leakyReLU().apply(x1NormalisedTS);

    // Merged
    const concatLayer = tf.layers.concatenate();
    const x1Merged = concatLayer.apply([x1, x1TS]);
    const x2Linear = tf.layers.dense({units: intermediateDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(x1Merged);
    const x2Normalised = tf.layers.batchNormalization({axis: 1}).apply(x2Linear);
    const x2 = tf.layers.leakyReLU().apply(x2Normalised);

    const zMean = tf.layers.dense({units: latentDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(x2);
    const zLogVar = tf.layers.dense({units: latentDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(x2);
    const z = new sampleLayer().apply([zMean, zLogVar]);
    const encoderOutputs = [zMean, zLogVar, z];
    const encoder = tf.model({inputs: [encoderInputs, encoderInputsTS], outputs: encoderOutputs, name: "encoder"})

    // build decoder model
    const decoderInputs = tf.input({shape: [latentDim]});
    const x3Linear = tf.layers.dense({units: intermediateDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(decoderInputs);
    const x3Normalised = tf.layers.batchNormalization({axis: 1}).apply(x3Linear);
    const x3 = tf.layers.leakyReLU().apply(x3Normalised);

    // Decoder for velocity
    const x4Linear = tf.layers.dense({units: intermediateDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(x3);
    const x4Normalised = tf.layers.batchNormalization({axis: 1}).apply(x4Linear);
    const x4 = tf.layers.leakyReLU().apply(x4Normalised);
    const decoderOutputs = tf.layers.dense({units: originalDim, activation: 'sigmoid'}).apply(x4);

    // Decoder for timeshift
    const x4LinearTS = tf.layers.dense({units: intermediateDim, useBias: true, kernelInitializer: 'glorotNormal'}).apply(x3);
    const x4NormalisedTS = tf.layers.batchNormalization({axis: 1}).apply(x4LinearTS);
    const x4TS = tf.layers.leakyReLU().apply(x4NormalisedTS);
    const decoderOutputsTS = tf.layers.dense({units: originalDim, activation: 'sigmoid'}).apply(x4TS);

    // Decoder model
    const decoder = tf.model({inputs: decoderInputs, outputs: [decoderOutputs, decoderOutputsTS], name: "decoder"})


    // build VAE model
    const vae = (inputs) => {
      return tf.tidy(() => {
        const [zMean, zLogVar, z] = this.encoder.apply(inputs);
        const outputs = this.decoder.apply(z);
        return [zMean, zLogVar, outputs];
      });
    }

    return [encoder, decoder, vae];
  }

  reconstructionLoss(yTrue, yPred) {
    return tf.tidy(() => {
      let reconstruction_loss;
      reconstruction_loss = tf.metrics.binaryCrossentropy(yTrue, yPred);
      reconstruction_loss = reconstruction_loss.mul(tf.scalar(yPred.shape[1]));
      return reconstruction_loss;
    });
  }

  mseLoss(yTrue, yPred) {
    return tf.tidy(() => {
      let mse_loss = tf.metrics.meanSquaredError(yTrue, yPred);
      mse_loss = mse_loss.mul(tf.scalar(yPred.shape[1]));
      mse_loss = mse_loss.mul(MSE_LOSS_COEF);
      return mse_loss;
    });
  }

  klLoss(z_mean, z_log_var) {
    return tf.tidy(() => {
      let kl_loss;
      kl_loss = tf.scalar(1).add(z_log_var).sub(z_mean.square()).sub(z_log_var.exp());
      kl_loss = tf.sum(kl_loss, -1);
      kl_loss = kl_loss.mul(tf.scalar(-0.5));
      return kl_loss;
    });
  }

  vaeLoss(yTrue, yPred) {
    return tf.tidy(() => {
      const [yTrueVel, yTrueTS] = yTrue;
      const [z_mean, z_log_var, y] = yPred;
      const [yVel, yTS] = y;
      const reconstruction_loss = this.reconstructionLoss(yTrueVel, yVel);
      const mse_loss = this.mseLoss(yTrueTS, yTS);
      const kl_loss = this.klLoss(z_mean, z_log_var);
      // console.log("reconstruction_loss", tf.mean(reconstruction_loss).dataSync());
      // console.log("mse_loss",  tf.mean(mse_loss).dataSync());
      // console.log("kl_loss",  tf.mean(kl_loss).dataSync());
      const total_loss = tf.mean(reconstruction_loss.add(mse_loss).add(kl_loss)); // averaged in the batch
      return total_loss;
    });
  }

  async train(data, trainConfig) {
    this.isTrained = false;
    this.isTraining = true;
    this.shouldStopTraining = false;
    if (trainConfig != undefined){
      this.trainConfig = trainConfig;
    }
    const config = this.trainConfig;

    const batchSize = config.batchSize;
    const numBatch = Math.floor(dataHandler.getDataSize() / batchSize);
    const epochs = numEpochs;
    const testBatchSize = config.testBatchSize;
    const optimizer = config.optimizer;
    const logMessage = console.log;
    const plotTrainLoss = console.log;
    const plotValLoss = console.log;

    const originalDim = this.modelConfig.originalDim;

    Max.outlet("training", 1);
    for (let i = 0; i < epochs; i++) {
      if (this.shouldStopTraining) break;

      let batchInput,batchInputTS;
      let trainLoss;
      let epochLoss;

      logMessage(`[Epoch ${i + 1}]\n`);
      Max.outlet("epoch", i + 1, epochs);
      epochLoss = 0;
      for (let j = 0; j < numBatch; j++) {
        batchInput = dataHandler.nextTrainBatch(batchSize).xs.reshape([batchSize, originalDim]);
        batchInputTS = dataHandlerTimeshift.nextTrainBatch(batchSize).xs.reshape([batchSize, originalDim]);
        trainLoss = await optimizer.minimize(() => this.vaeLoss([batchInput, batchInputTS], this.apply([batchInput, batchInputTS])), true);
        trainLoss = Number(trainLoss.dataSync());
        epochLoss = epochLoss + trainLoss;
        // logMessage(`\t[Batch ${j + 1}] Training Loss: ${trainLoss}.\n`);
        //plotTrainLoss(trainLoss);

        await tf.nextFrame();
      }
      epochLoss = epochLoss / numBatch;
      logMessage(`\t[Average] Training Loss: ${epochLoss}.\n`);
      logMessage(i, epochs);

      Max.outlet("loss", epochLoss);

      // testBatchInput = data.nextTrainBatch(testBatchSize).xs.reshape([testBatchSize, originalDim]);
      // testBatchResult = this.apply(testBatchInput);
      // valLoss = this.vaeLoss(testBatchInput, testBatchResult);
      // valLoss = Number(valLoss.dataSync());
      // plotValLoss(valLoss);
      await tf.nextFrame();
    }
    this.isTrained = true;
    this.isTraining = false;
    Max.outlet("training", 0);
    utils.log_status("Training finished!");
  }
  
  generate(zs){
    let [outputs, outputsTS] = this.decoder.apply(zs);

    outputs = outputs.reshape([NUM_DRUM_CLASSES, LOOP_DURATION]);    
    outputsTS = outputsTS.reshape([NUM_DRUM_CLASSES, LOOP_DURATION]); // timshift output

    return [outputs.arraySync(), outputsTS.arraySync()];
  }

  async saveModel(path){
    const saved = await this.decoder.save(path);
    utils.post(saved);
  }

  async loadModel(path){
    this.decoder = await tf.loadLayersModel(path);
    this.isTrained = true;
  }
}

function range(start, edge, step) {
  // If only one number was passed in make it the edge and 0 the start.
  if (arguments.length == 1) {
    edge = start;
    start = 0;
  }

  // Validate the edge and step numbers.
  edge = edge || 0;
  step = step || 1;

  // Create the array of numbers, stopping befor the edge.
  for (var ret = []; (edge - start) * step > 0; start += step) {
    ret.push(start);
  }
  return ret;
}

exports.loadAndTrain = loadAndTrain;
exports.saveModel = saveModel;
exports.loadModel = loadModel;
exports.generatePattern = generatePattern;
exports.stopTraining = stopTraining;
exports.isReadyToGenerate = isReadyToGenerate;
exports.isTraining = isTraining;
exports.setEpochs = setEpochs;

