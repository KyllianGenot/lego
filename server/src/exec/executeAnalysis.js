const { analyzeProfitability } = require('../analysis/analyzer');

const args = process.argv.slice(2);
if (args.length > 0) {
  const input = args[0];
  analyzeProfitability(input)
    .catch(error => {
      console.error('Error during analysis:', error);
      process.exit(1);
    });
} else {
  console.log('Please provide a URL from dealabs.com or a LEGO set name');
  console.log('Example: node src/exec/executeAnalysis.js "https://www.dealabs.com/bons-plans/lego-classic-la-boite-creative-du-bonheur-11042-3017948"');
  console.log('Example: node src/exec/executeAnalysis.js "11042"');
  process.exit(1);
}