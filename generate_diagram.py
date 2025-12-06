from manim import *

class DialecticStyle:
    BASE_COLOR = PURPLE
    SUPER_COLOR = RED
    TEXT_COLOR = WHITE
    BG_COLOR = "#1a1a1a"

class Overview(Scene):
    def construct(self):
        self.camera.background_color = DialecticStyle.BG_COLOR
        
        # --- Create Shapes ---
        superstructure = Rectangle(height=2, width=6, color=DialecticStyle.SUPER_COLOR, fill_opacity=0.2)
        superstructure.shift(UP * 2)
        super_label = Text("SUPERSTRUCTURE", font_size=36, color=DialecticStyle.SUPER_COLOR).move_to(superstructure)
        super_sub = Text("(Ideology & Political-Legal)", font_size=20, color=GRAY).next_to(super_label, DOWN)

        base = Rectangle(height=2, width=6, color=DialecticStyle.BASE_COLOR, fill_opacity=0.2)
        base.shift(DOWN * 2)
        base_label = Text("BASE", font_size=36, color=DialecticStyle.BASE_COLOR).move_to(base)
        base_sub = Text("(Mode of Production)", font_size=20, color=GRAY).next_to(base_label, DOWN)

        # --- Arrows ---
        # Determination (Base -> Superstructure)
        arrow_up = Arrow(start=base.get_top(), end=superstructure.get_bottom(), color=WHITE, buff=0.2)
        label_up = Text("Determines", font_size=16, slant=ITALIC).next_to(arrow_up, RIGHT)
        
        # Reproduction (Superstructure -> Base)
        # Curved arrow to show feedback loop
        arrow_down = CurvedArrow(
            start_point=superstructure.get_left() + LEFT * 0.5, 
            end_point=base.get_left() + LEFT * 0.5, 
            color=WHITE,
            angle=TAU/4
        )
        label_down = Text("Reproduces", font_size=16, slant=ITALIC).next_to(arrow_down, LEFT)

        # --- Animations ---
        self.play(DrawBorderThenFill(base), Write(base_label), Write(base_sub))
        self.play(DrawBorderThenFill(superstructure), Write(super_label), Write(super_sub))
        self.play(GrowArrow(arrow_up), Write(label_up))
        self.play(Create(arrow_down), Write(label_down))
        
        self.wait(2)

class ZoomBase(Scene):
    def construct(self):
        self.camera.background_color = DialecticStyle.BG_COLOR
        
        # Initial State (Simplified Overview)
        base = Rectangle(height=2, width=6, color=DialecticStyle.BASE_COLOR, fill_opacity=0.2).shift(DOWN * 2)
        base_label = Text("BASE", font_size=36, color=DialecticStyle.BASE_COLOR).move_to(base)
        
        self.add(base, base_label)
        
        # Zoom Target
        self.play(
            self.camera.frame.animate.set(width=base.width * 1.2).move_to(base),
            run_time=1.5
        )
        self.play(FadeOut(base_label))

class ZoomSuperstructure(Scene):
    def construct(self):
        self.camera.background_color = DialecticStyle.BG_COLOR
        
        # Initial State
        superstructure = Rectangle(height=2, width=6, color=DialecticStyle.SUPER_COLOR, fill_opacity=0.2).shift(UP * 2)
        super_label = Text("SUPERSTRUCTURE", font_size=36, color=DialecticStyle.SUPER_COLOR).move_to(superstructure)
        
        self.add(superstructure, super_label)
        
        # Zoom Target
        self.play(
            self.camera.frame.animate.set(width=superstructure.width * 1.2).move_to(superstructure),
            run_time=1.5
        )
        self.play(FadeOut(super_label))

class BaseDetail(Scene):
    def construct(self):
        self.camera.background_color = DialecticStyle.BG_COLOR
        
        # Frame setup (already zoomed in context)
        # We recreate the "zoomed in" view
        
        title = Text("RELATIONS & FORCES", font_size=48, color=DialecticStyle.BASE_COLOR).to_edge(UP)
        
        # Relations
        relations_group = VGroup()
        r_title = Text("Relations of Production", font_size=32, color=PURPLE_A)
        r_items = VGroup(
            Text("Bourgeoisie / Proletariat", font_size=24),
            Text("Exploitation", font_size=24),
            Text("Capital", font_size=24)
        ).arrange(DOWN, aligned_edge=LEFT)
        relations_group.add(r_title, r_items).arrange(DOWN, aligned_edge=LEFT)
        
        # Forces
        forces_group = VGroup()
        f_title = Text("Forces of Production", font_size=32, color=BLUE)
        f_items = VGroup(
            Text("Labor Power", font_size=24),
            Text("Tools & Tech", font_size=24),
            Text("Raw Materials", font_size=24)
        ).arrange(DOWN, aligned_edge=LEFT)
        forces_group.add(f_title, f_items).arrange(DOWN, aligned_edge=LEFT)
        
        # Layout
        content = VGroup(relations_group, forces_group).arrange(RIGHT, buff=2)
        
        self.play(Write(title))
        self.play(FadeIn(content, shift=UP))
        self.wait(2)

class SuperstructureDetail(Scene):
    def construct(self):
        self.camera.background_color = DialecticStyle.BG_COLOR
        
        title = Text("IDEOLOGY & STATE", font_size=48, color=DialecticStyle.SUPER_COLOR).to_edge(UP)
        
        # RSAs
        rsa_group = VGroup()
        r_title = Text("RSA (Repressive)", font_size=32, color=RED_A)
        r_items = VGroup(
            Text("Police", font_size=24),
            Text("Army", font_size=24),
            Text("Courts", font_size=24)
        ).arrange(DOWN, aligned_edge=LEFT)
        rsa_group.add(r_title, r_items).arrange(DOWN, aligned_edge=LEFT)
        
        # ISAs
        isa_group = VGroup()
        i_title = Text("ISA (Ideological)", font_size=32, color=ORANGE)
        i_items = VGroup(
            Text("School", font_size=24),
            Text("Family", font_size=24),
            Text("Media", font_size=24),
            Text("Religion", font_size=24)
        ).arrange(DOWN, aligned_edge=LEFT)
        isa_group.add(i_title, i_items).arrange(DOWN, aligned_edge=LEFT)
        
        content = VGroup(rsa_group, isa_group).arrange(RIGHT, buff=2)
        
        self.play(Write(title))
        self.play(FadeIn(content, shift=DOWN))
        self.wait(2)
