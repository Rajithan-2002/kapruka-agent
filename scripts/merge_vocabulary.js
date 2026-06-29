const fs = require('fs');
const path = require('path');

const vocabularyDir = path.join(__dirname, '..', 'datasets', 'vocabulary');
const outputPath = path.join(__dirname, '..', 'datasets', 'sri_lankan_normalization_dictionary.json');

const filesToMerge = [
    'intent_signals.json',
    'relationship_vocabulary.json',
    'occasion_vocabulary.json',
    'shopping_products.json',
    'location_aliases.json',
    'budget_terms.json',
    'singlish_connectors.json',
    'greetings.json'
];

try {
    const mergedData = {};

    filesToMerge.forEach(file => {
        const filePath = path.join(vocabularyDir, file);
        const key = path.basename(file, '.json');
        
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            try {
                mergedData[key] = JSON.parse(content);
            } catch (jsonErr) {
                console.error(`Error parsing JSON in file ${file}:`, jsonErr.message);
                process.exit(1);
            }
        } else {
            console.warn(`Warning: Vocabulary file not found: ${file}. Initializing as empty array.`);
            mergedData[key] = [];
        }
    });

    // Write the unified file
    fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf8');
    console.log(`Successfully merged ${filesToMerge.length} vocabulary files into ${outputPath}`);
} catch (err) {
    console.error('Failed to merge vocabulary:', err);
    process.exit(1);
}
