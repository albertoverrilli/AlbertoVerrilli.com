from moviepy import VideoFileClip, concatenate_videoclips, vfx

def create_seamless_loop(input_path, output_path):
    print(f"Opening {input_path}...")
    original = VideoFileClip(input_path)
    
    print("Generating reverse clip...")
    try:
        # MoviePy v2 approach
        reversed_clip = original.with_effects([vfx.TimeMirror()])
    except AttributeError:
        # Fallback or alternative v2 syntax check
        print("vfx.TimeMirror not found, trying legacy/alternative...")
        try:
            reversed_clip = original.fx(vfx.time_mirror)
        except:
             reversed_clip = original.fl_time(lambda t: original.duration - t, keep_duration=True)
    
    print("Concatenating forward and reverse clips...")
    final_clip = concatenate_videoclips([original, reversed_clip])
    
    print(f"Writing seamless loop to {output_path}...")
    final_clip.write_videofile(output_path, fps=original.fps, codec='libx264', audio=False)
    
    print("Setup complete!")

if __name__ == "__main__":
    input_video = "img/bg-gen4.mp4"
    output_video = "img/bg-gen4-seamless.mp4"
    create_seamless_loop(input_video, output_video)
