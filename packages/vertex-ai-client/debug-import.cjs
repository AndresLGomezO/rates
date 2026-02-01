const aiplatform = require('@google-cloud/aiplatform');
console.log('Keys:', Object.keys(aiplatform));
console.log('VertexAI in keys?', 'VertexAI' in aiplatform);
console.log('v1 keys:', aiplatform.v1 ? Object.keys(aiplatform.v1) : 'no v1');
console.log('v1beta1 keys:', aiplatform.v1beta1 ? Object.keys(aiplatform.v1beta1) : 'no v1beta1');

try {
    const { VertexAI } = require('@google-cloud/vertexai');
    console.log('Found @google-cloud/vertexai package');
} catch (e) {
    console.log('@google-cloud/vertexai not found');
}
