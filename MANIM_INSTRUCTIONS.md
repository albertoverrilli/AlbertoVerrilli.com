# Manim Diagram Instructions

To view the interactive diagram, you first need to generate the video and image assets using Python and Manim.

## Prerequisites

1.  **Python**: Ensure Python is installed.
2.  **FFmpeg**: Required for video generation.
3.  **LaTeX**: Required for text rendering in Manim.
4.  **Manim**: Install via pip:
    ```bash
    pip install manim
    ```

## Generation Steps

1.  Open a terminal in this folder: `c:\Users\alber\Documents\Projects\public_html\`
2.  Run the generation script:
    ```bash
    manim -pqh generate_diagram.py Overview ZoomBase ZoomSuperstructure BaseDetail SuperstructureDetail
    ```
    *Flags:*
    *   `-p`: Preview (opens file after generation, optional)
    *   `-qh`: Quality High (1080p)
    *   `-s`: Save last frame as image (We need this for the static states!)

    **IMPORTANT**: You need to generate both videos and static images.
    
    **Run these commands specifically:**

    ```bash
    # Generate Videos
    manim -qh generate_diagram.py ZoomBase ZoomSuperstructure

    # Generate Static Images (Last Frame)
    manim -qh -s generate_diagram.py Overview BaseDetail SuperstructureDetail
    ```

## Viewing

1.  Once generation is complete, open `ManimDialectic.html` in your browser.
2.  The page should load the generated images and videos from the `media/` folder that Manim creates.
