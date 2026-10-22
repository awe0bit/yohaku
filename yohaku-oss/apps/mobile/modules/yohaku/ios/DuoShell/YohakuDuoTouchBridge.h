#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface YohakuDuoTouchBridge : NSObject
- (void)attachToView:(UIView *)view;
- (void)detach;
@end

NS_ASSUME_NONNULL_END
