from app.core.config import Settings


def test_depth_profiles_are_fixed_and_ordered() -> None:
    settings = Settings(
        depth_quick_iterations=1,
        depth_standard_iterations=2,
        depth_deep_iterations=3,
        depth_quick_target_sections=4,
        depth_standard_target_sections=8,
        depth_deep_target_sections=12,
    )

    quick = settings.depth_profile("quick")
    standard = settings.depth_profile("standard")
    deep = settings.depth_profile("deep")

    assert quick.max_iterations == 1
    assert standard.max_iterations == 2
    assert deep.max_iterations == 3

    assert quick.target_sections == 4
    assert standard.target_sections == 8
    assert deep.target_sections == 12

    assert quick.query_fanout <= standard.query_fanout <= deep.query_fanout
