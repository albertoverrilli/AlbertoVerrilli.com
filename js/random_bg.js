document.addEventListener('DOMContentLoaded', () => {
    // List of images to select from (Bryce 3D collection)
    const images = [
        'Angelic Benediction.webp',
        'Anomaly-[SPHERE].webp',
        'Anomaly_008a.webp',
        'Creation.webp',
        'Crystalline Plain.webp',
        'Digital Transcendence.webp',
        'Expea.webp',
        'Freight.webp',
        'GENisys.webp',
        'Garden of Eden.webp',
        'Hedrons.webp',
        'Mario Party.webp',
        'Oasis.webp',
        'SpiralizerTest.webp',
        'Station Nila II.webp',
        'Stone Sanctuary.webp',
        'Suspension.webp',
        'Vapor.webp',
        'Venus Arc.webp',
        'Wayside.webp',
        'WorldTree01.webp',
        'lapse.webp',
        'mote.webp',
        'sphere.webp'
    ];

    // Select random image from bryce folder
    const selectedImage = images[Math.floor(Math.random() * images.length)];
    const imagePath = `img/bryce/webp/${selectedImage}`;

    // Set background immediately for visual feedback
    document.body.style.backgroundImage = `url('${imagePath}')`;

    // Extract colors and theme the page
    extractAndTheme(imagePath);
});

function extractAndTheme(imageSrc) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Resize for faster processing
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let r = 0, g = 0, b = 0;
        let count = 0;

        // Calculate average color
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        // Calculate luminance (perceived brightness)
        // Formula: 0.299*R + 0.587*G + 0.114*B
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

        // Determine theme based on luminance
        const isDark = luminance < 128;

        console.log(`Analyzing background: ${imageSrc}`);
        console.log(`Avg Color: rgb(${r}, ${g}, ${b})`);
        console.log(`Luminance: ${luminance}`);
        console.log(`Theme: ${isDark ? 'Dark' : 'Light'}`);

        // Apply theme variables
        const root = document.documentElement;

        // Set box background to a semi-transparent version of the average color
        // This makes it fit the theme while still being distinct
        // Adjust alpha for readability - if light theme, maybe more opaque
        // Using 0.85 opacity standard
        root.style.setProperty('--box-bg-color', `rgba(${r}, ${g}, ${b}, 0.85)`);

        if (isDark) {
            // Dark background -> Light text
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--border-color', '#ffffff');
            root.style.setProperty('--hover-text-color', '#000000');
            root.style.setProperty('--accent-color', '#ffffff');
            root.style.setProperty('--button-bg', 'rgba(0, 0, 0, 0.6)');
            root.style.setProperty('--shadow-color', '#ffffff');
        } else {
            // Light background -> Dark text
            root.style.setProperty('--text-color', '#000000');
            root.style.setProperty('--border-color', '#000000');
            root.style.setProperty('--hover-text-color', '#ffffff');
            root.style.setProperty('--accent-color', '#000000');
            root.style.setProperty('--button-bg', 'rgba(255, 255, 255, 0.6)');
            root.style.setProperty('--shadow-color', '#000000');
        }
    };

    img.onerror = (e) => {
        console.error("Failed to load background image for color extraction", e);
    };
}
