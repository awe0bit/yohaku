#import "YohakuDuoTouchBridge.h"
#import <React/RCTSurfaceTouchHandler.h>

@implementation YohakuDuoTouchBridge {
  RCTSurfaceTouchHandler *_handler;
  __weak UIView *_view;
}

- (void)attachToView:(UIView *)view
{
  [self detach];
  _handler = [RCTSurfaceTouchHandler new];
  [_handler attachToView:view];
  _view = view;
}

- (void)detach
{
  if (_handler && _view) {
    [_handler detachFromView:_view];
  }
  _handler = nil;
  _view = nil;
}

@end
