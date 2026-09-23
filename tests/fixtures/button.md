---
title: Button
template: component
headline: Buttons highlight actions available on a screen.
sources:
  - label: github
    value: '/modules/react/button'
  - label: storybook
    value: '/story/components-buttons--primary'
  - label: figma
    value: 'Primary Button'
componentMeta:
  componentType: button
  package: '@workday/canvas-kit-react'
  platform: web
idsMeta:
  deliveryChannels:
    - web
---

## Anatomy

![Image of a Primary and Secondary Button with annotation markers.](./assets/component-anatomy-button.png)

1. **Container (Conditional)**: Houses the contents of the Button. Visual appearance differs based
   on button type.
2. **Label (Conditional)**: Specific text describing the action. Refer to the
   [Buttons and Calls to Action](https://canvas.workdaydesign.com/guidelines/content/ui-text/buttons-and-calls-to-action)
   section of the Content Style Guide.
3. **Icon (Conditional)**: Supplementary visual indicator that can be positioned alone or added to
   the left or right of the label. Supplemental icons are used to promote the purpose of the Button.

## Usage Guidance

- Buttons should indicate an action.
- They should be discoverable, easy to identify, and specific.
- Make Buttons look and feel clickable.
- Icons can be used alone or added to the left or right of the label. If used, the icon should
  signify what the Button does.
- Use icon-only variants in dense environments or when space is limited.
- Use accessible [tooltips](/design-system/components/tooltip) with icon-only variants to help
  explain ambiguous icons for everyone.
- When deciding which Button to use, consider the level of priority of the action, as well as how
  much visual emphasis the Button should have in the context of the page it will live on. Be
  intentional and refer to the examples below to determine which is right for your use case.

### When to Use Something Else

- Use Hyperlinks within a paragraph to navigate to another page.
- Consider using [checkbox](/design-system/components/checkbox),
  [switch](/design-system/components/switch), or
  [segmented control](/design-system/components/segmented-control) when a component is needed that
  can capture 2 togglable states.

### Design Annotations for Accessibility

- Write accessible name for icon-only button variants. Read more about
  [non-text content](https://canvas.workdaydesign.com/accessibility/alt-text#what-is-non-text-content).

## Examples

### PrimaryButton

<!-- No <SymbolDescription> available for PrimaryButton -->

The example below shows multiple instances of a `PrimaryButton` with various icon configurations.

```tsx
import {PrimaryButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <PrimaryButton>Primary</PrimaryButton>
    <PrimaryButton icon={plusIcon} iconPosition="start">
      Primary
    </PrimaryButton>
    <PrimaryButton icon={caretDownIcon} iconPosition="end">
      Primary
    </PrimaryButton>
    <Tooltip title="Related Actions">
      <PrimaryButton icon={relatedActionsVerticalIcon} />
    </Tooltip>
  </Flex>
);

```

Primary Buttons also have an `inverse` variant. While it looks similar to the default Secondary
Button, the default outline as well as the hover and focus states are different. Use this variant
when you need to place a Primary Button on a dark or colorful background such as `neutral400`.

```tsx
import React from 'react';

import {PrimaryButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  backgroundColor: system.color.surface.contrast.default,
  padding: system.padding.md,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <PrimaryButton variant="inverse">Primary</PrimaryButton>
    <PrimaryButton icon={plusIcon} iconPosition="start" variant="inverse">
      Primary
    </PrimaryButton>
    <PrimaryButton icon={caretDownIcon} iconPosition="end" variant="inverse">
      Primary
    </PrimaryButton>
    <Tooltip title="Related Actions">
      <PrimaryButton icon={relatedActionsVerticalIcon} variant="inverse" />
    </Tooltip>
  </Flex>
);

```

### SecondaryButton

<!-- No <SymbolDescription> available for SecondaryButton -->

The example below shows multiple instances of a `SecondaryButton` with various icon configurations.

```tsx
import React from 'react';

import {SecondaryButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <SecondaryButton>Secondary</SecondaryButton>
    <SecondaryButton icon={plusIcon} iconPosition="start">
      Secondary
    </SecondaryButton>
    <SecondaryButton icon={caretDownIcon} iconPosition="end">
      Secondary
    </SecondaryButton>
    <Tooltip title="Related Actions">
      <SecondaryButton icon={relatedActionsVerticalIcon} />
    </Tooltip>
  </Flex>
);

```

Secondary Buttons also have an `inverse` variant. Use this when you need to place a Secondary Button
on a dark or colorful background such as `neutral400`.

```tsx
import React from 'react';

import {SecondaryButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
  backgroundColor: system.color.surface.contrast.default,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <SecondaryButton variant="inverse">Secondary</SecondaryButton>
    <SecondaryButton icon={plusIcon} variant="inverse">
      Secondary
    </SecondaryButton>
    <SecondaryButton icon={caretDownIcon} variant="inverse" iconPosition="end">
      Secondary
    </SecondaryButton>
    <Tooltip title="Related Actions">
      <SecondaryButton icon={relatedActionsVerticalIcon} variant="inverse" />
    </Tooltip>
  </Flex>
);

```

### TertiaryButton

<!-- No <SymbolDescription> available for TertiaryButton -->

The example below shows multiple instances of a `TertiaryButton` with various icon configurations.

```tsx
import React from 'react';

import {TertiaryButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <TertiaryButton>Tertiary</TertiaryButton>
    <TertiaryButton icon={plusIcon} iconPosition="start">
      Tertiary
    </TertiaryButton>
    <TertiaryButton icon={caretDownIcon} iconPosition="end">
      Tertiary
    </TertiaryButton>
    <Tooltip title="Related Actions">
      <TertiaryButton icon={relatedActionsVerticalIcon} />
    </Tooltip>
  </Flex>
);

```

Tertiary Buttons also have an `inverse` variant. Use this when you need to place a Tertiary Button
on a dark or colorful background such as `neutral400`.

```tsx
import React from 'react';

import {TertiaryButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
  backgroundColor: system.color.surface.contrast.default,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <TertiaryButton variant="inverse">Tertiary</TertiaryButton>
    <TertiaryButton icon={plusIcon} iconPosition="start" variant="inverse">
      Tertiary
    </TertiaryButton>
    <TertiaryButton icon={caretDownIcon} iconPosition="end" variant="inverse">
      Tertiary
    </TertiaryButton>
    <Tooltip title="Related Actions">
      <TertiaryButton icon={relatedActionsVerticalIcon} variant="inverse" />
    </Tooltip>
  </Flex>
);

```

### DeleteButton

Use sparingly for destructive actions that will result in data loss, can’t be undone, or will
have significant consequences. They commonly appear in confirmation dialogs as the final
confirmation before being deleted.

```tsx
import {DeleteButton} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {trashIcon} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
});

export default () => (
  <Flex cs={parentContainerStyles}>
    <DeleteButton>Delete</DeleteButton>
    <DeleteButton icon={trashIcon} iconPosition="start">
      Delete
    </DeleteButton>
    <DeleteButton icon={trashIcon} iconPosition="end">
      Delete
    </DeleteButton>
    <Tooltip title="Delete">
      <DeleteButton icon={trashIcon} />
    </Tooltip>
  </Flex>
);

```

Delete Buttons also have an `outline` variant.

```tsx
import {DeleteButton} from '@workday/canvas-kit-react/button';
import {Tooltip} from '@workday/canvas-kit-react/tooltip';
import {createStyles} from '@workday/canvas-kit-styling';
import {trashIcon} from '@workday/canvas-system-icons-web';
import {system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  display: 'flex',
  gap: system.gap.md,
  padding: system.padding.md,
});

export default () => (
  <div className={parentContainerStyles}>
    <DeleteButton variant="outline">Delete</DeleteButton>
    <DeleteButton icon={trashIcon} iconPosition="start" variant="outline">
      Delete
    </DeleteButton>
    <DeleteButton icon={trashIcon} iconPosition="end" variant="outline">
      Delete
    </DeleteButton>
    <Tooltip title="Delete">
      <DeleteButton icon={trashIcon} variant="outline" />
    </Tooltip>
  </div>
);

```

### Grow Prop

The example below shows the use of the `grow` prop on different variants of buttons. This will set
the width of the button to the width of its container.

```tsx
import {
  DeleteButton,
  PrimaryButton,
  SecondaryButton,
  TertiaryButton,
} from '@workday/canvas-kit-react/button';
import {Flex} from '@workday/canvas-kit-react/layout';
import {px2rem} from '@workday/canvas-kit-styling';
import {system} from '@workday/canvas-tokens-web';

const baseStyles = {
  gap: system.gap.md,
  padding: system.padding.md,
  flexDirection: 'column',
  maxWidth: px2rem(300),
};

export default () => (
  <Flex cs={baseStyles}>
    <PrimaryButton size="small" grow={true}>
      Primary
    </PrimaryButton>
    <SecondaryButton size="small" grow={true}>
      Secondary
    </SecondaryButton>
    <TertiaryButton size="small" grow={true}>
      Tertiary
    </TertiaryButton>
    <DeleteButton size="small" grow={true}>
      Delete
    </DeleteButton>
  </Flex>
);

```

### Custom Styles

All of our buttons support custom styling via the `cs` prop. For more information, check our
["How To Customize Styles"](https://workday.github.io/canvas-kit/?path=/docs/styling-guides-customizing-styles--docs)
or view the example below.

```tsx
import {PrimaryButton, PrimaryButtonProps, buttonStencil} from '@workday/canvas-kit-react/button';
import {createComponent} from '@workday/canvas-kit-react/common';
import {systemIconStencil} from '@workday/canvas-kit-react/icon';
import {Grid} from '@workday/canvas-kit-react/layout';
import {createStencil, createStyles, px2rem} from '@workday/canvas-kit-styling';
import {plusIcon} from '@workday/canvas-system-icons-web';
import {base, system} from '@workday/canvas-tokens-web';

const customContainer = createStyles({
  gap: system.gap.md,
  maxWidth: 'max-content',
});

const myButtonStencil = createStencil({
  base: {
    [buttonStencil.vars.background]: base.green100,
    [buttonStencil.vars.label]: base.green700,
    [systemIconStencil.vars.color]: base.green700,
    [buttonStencil.vars.borderRadius]: px2rem(2),
    border: `${px2rem(3)} solid transparent`,
    '&:focus-visible': {
      [buttonStencil.vars.background]: base.green700,
      [buttonStencil.vars.boxShadowInner]: base.green100,
      [buttonStencil.vars.boxShadowOuter]: base.green700,
      [systemIconStencil.vars.color]: system.color.fg.inverse,
    },
    '&:hover': {
      [buttonStencil.vars.background]: base.green600,
      border: `${px2rem(3)} dotted ${base.green700}`,
      [buttonStencil.vars.label]: base.green700,
      [systemIconStencil.vars.color]: system.color.fg.inverse,
    },
    '&:active': {
      [buttonStencil.vars.background]: base.green700,
      [buttonStencil.vars.label]: system.color.fg.inverse,
      [systemIconStencil.vars.color]: system.color.fg.inverse,
    },
  },
});

const MyCustomButton = createComponent('button')({
  Component: ({children, cs, ...elemProps}: PrimaryButtonProps, ref, Element) => (
    <PrimaryButton as={Element} ref={ref} cs={[myButtonStencil(), cs]} {...elemProps}>
      {children}
    </PrimaryButton>
  ),
});

const myCustomStyles = createStyles({
  padding: system.padding.md,
  textTransform: 'uppercase',
  [buttonStencil.vars.background]: base.slate200,
  [buttonStencil.vars.label]: base.slate700,
  [systemIconStencil.vars.color]: base.slate700,
  [buttonStencil.vars.borderRadius]: system.shape.md,
  [buttonStencil.vars.border]: base.slate800,
  '&:focus-visible': {
    [buttonStencil.vars.background]: base.slate700,
    [buttonStencil.vars.boxShadowInner]: base.slate200,
    [buttonStencil.vars.boxShadowOuter]: base.slate700,
    [systemIconStencil.vars.color]: system.color.fg.inverse,
  },
  '&:hover': {
    [buttonStencil.vars.background]: base.slate600,
    [buttonStencil.vars.border]: `${px2rem(3)} dotted ${base.slate700}`,
    [buttonStencil.vars.label]: base.slate700,
    [systemIconStencil.vars.color]: system.color.fg.inverse,
    border: `${px2rem(3)} dotted ${base.slate700}`,
  },
  '&:active': {
    [buttonStencil.vars.background]: base.slate700,
    [buttonStencil.vars.label]: system.color.fg.inverse,
    [systemIconStencil.vars.color]: system.color.fg.inverse,
  },
});

const customColors = {
  default: {
    background: base.amber100,
    icon: base.amber500,
    label: base.amber500,
  },
  focus: {
    background: base.amber500,
    boxShadowInner: base.amber100,
    boxShadowOuter: base.amber500,
  },
  hover: {
    background: base.amber400,
    icon: system.color.fg.inverse,
  },
  active: {
    background: base.amber500,
  },
  disabled: {},
};

export default () => (
  <Grid cs={customContainer}>
    <MyCustomButton icon={plusIcon}>Styling Override Via Stencil Variables</MyCustomButton>
    <MyCustomButton icon={plusIcon} cs={myCustomStyles}>
      Style Override Via Create Styles
    </MyCustomButton>
    <PrimaryButton icon={plusIcon} colors={customColors}>
      Styling Override Via Colors Prop
    </PrimaryButton>
  </Grid>
);

```

### Theme Overrides

The most common way to theme our buttons is to pass a `theme` object at the root level of the
application via the `CanvasProvider`. In the example below, our buttons use our `brand.action.**`
tokens with the fallback being `brand.primary.**`.

> **Caution:** Setting `--cnvs-brand-action**` tokens at the `:root` CSS will override all
> `PrimaryButton` theme colors set at the `CanvasProvider` level.

> **Note:** You should **not** individually theme components wrapping them with the
> `CanvasProvider`, but rather theme at the root level of the application.

```tsx
import React from 'react';

import {PrimaryButton} from '@workday/canvas-kit-react/button';
import {CanvasProvider} from '@workday/canvas-kit-react/common';
import {Flex} from '@workday/canvas-kit-react/layout';
import {Heading} from '@workday/canvas-kit-react/text';
import {createStyles} from '@workday/canvas-kit-styling';
import {
  caretDownIcon,
  plusIcon,
  relatedActionsVerticalIcon,
} from '@workday/canvas-system-icons-web';
import {brand, system} from '@workday/canvas-tokens-web';

const parentContainerStyles = createStyles({
  gap: system.gap.md,
  padding: system.padding.md,
});

const customActionTheme = createStyles({
  [brand.action.base]: 'teal',
  [brand.action.accent]: 'white',
  [brand.action.dark]: 'hsla(180, 100%, 20%)',
  [brand.action.darkest]: 'hsla(180, 100%, 16%)',
});

export default () => (
  <div>
    <Heading size="medium" as="h3">
      Override Primary Color Via Canvas Provider
    </Heading>
    <CanvasProvider
      theme={{
        canvas: {
          palette: {
            primary: {
              main: 'navy',
            },
          },
        },
      }}
    >
      <Flex cs={parentContainerStyles}>
        <PrimaryButton>Primary</PrimaryButton>
        <PrimaryButton icon={plusIcon} iconPosition="start">
          Primary
        </PrimaryButton>
        <PrimaryButton icon={caretDownIcon} iconPosition="end">
          Primary
        </PrimaryButton>
        <PrimaryButton aria-label="Related Actions" icon={relatedActionsVerticalIcon} />
      </Flex>
    </CanvasProvider>
    <Heading size="medium" as="h3">
      Override Action Color Via CSS Action Token
    </Heading>
    <div className={customActionTheme}>
      <Flex cs={parentContainerStyles}>
        <PrimaryButton>Primary</PrimaryButton>
        <PrimaryButton icon={plusIcon} iconPosition="start">
          Primary
        </PrimaryButton>
        <PrimaryButton icon={caretDownIcon} iconPosition="end">
          Primary
        </PrimaryButton>
        <PrimaryButton aria-label="Related Actions" icon={relatedActionsVerticalIcon} />
      </Flex>
    </div>
  </div>
);

```

## Accessibility

Our button components render semantic HTML `<button>` elements to the browser DOM. This means that
ARIA roles won't be necessary in most cases, and `onClick` listeners will automatically support the
Enter and Space keys for keyboard interactions.

[Button Pattern | APG | WAI | W3C](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

- An `aria-label` is only necessary for icon-only buttons in most cases. Using
  [Canvas Kit's tooltip component](/components/popups/tooltip/) will handle this for you, and all
  users will be able to see the label for the button.
- When button designs have 2 toggle states, an `aria-pressed={true | false}` property is required
  for screen reader support. For example, see Canvas Kit's
  [Segmented Control component](/components/buttons/segmented-control/).
- When buttons have an attached menu, an `aria-haspopup="true"` property is required. Using
  [Canvas Kit's Menu component](/components/popups/menu/) will handle this for you.
- The icons used in text buttons are decorative in most cases and include ARIA `role="presentation"`
  and `focusable="false"`. In some special cases where an icon does add meaning, you may be required
  to change the `role` and add an `aria-label` to the icon for equivalent screen reader support.

### Disabled Buttons

- Disabled buttons use the `disabled` attribute, removing them from the tab order.
- Disabled styling is exempt from WCAG contrast requirements.

### Screen Reader Experience

- Button text content is announced along with the button role (e.g., "Primary, button").
- Icon-only buttons announce the `aria-label` value along with the button role.
- Toggle buttons announce their pressed/unpressed state (e.g., "Activity Stream, toggle button,
  pressed" and check out the [Segmented Control component](/components/buttons/segmented-control/)).

### Touch Target Size

- All buttons meet the minimum 24px by 24px touch target size requirement for mobile accessibility.
- Button padding ensures adequate spacing between interactive elements to prevent accidental
  activation.

### Button Groups

- Related buttons can be grouped together with HTML unordered list elements or with `<fieldset>` and
  `<legend>` elements. This can help give additional context to screen readers about the purpose of
  the group.

## Component API

## PrimaryButton

**Component Type:** `enhancedComponent`

**Display Name:** `PrimaryButton`

**Base Element:** [button](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button)

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| variant | `"inverse"` |  | Variant has an option for `inverse` which will inverse the styling |
| iconPosition | `"start"` | `"end"` | `"start"` | Button icon positions can either be `start` or `end`. If no value is provided, it defaults to `start`. |
| shouldMirrorIcon | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the icon should mirror only when in an right-to-left language, use `shouldMirrorIconInRTL` instead. |
| shouldMirrorIconInRTL | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| size | `ButtonSizes` | `'medium` | There are four button sizes: `extraSmall`, `small`, `medium`, and `large`. If no size is provided, it will default to `medium`. |
| colors | `ButtonColors` |  | Override default colors of a button. The default will depend on the button type |
| icon | `CanvasSystemIcon` |  | The icon of the Button. Note: Not displayed at `small` size |
| shouldMirror | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the SVG should mirror only when in an right-to-left language, use `shouldMirrorInRTL` instead. |
| shouldMirrorInRTL | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| cs | `CSToPropsInput` |  | The `cs` prop takes in a single value or an array of values. You can pass the CSS class name returned by {@link createStyles }, or the result of {@link createVars } and {@link createModifiers }. If you're extending a component already using `cs`, you can merge that prop in as well. Any style that is passed to the `cs` prop will override style props. If you wish to have styles that are overridden by the `css` prop, or styles added via the `styled` API, use {@link handleCsProp } wherever `elemProps` is used. If your component needs to also handle style props, use `mergeStyles` instead.<br><br> ```tsx import {handleCsProp} from '@workday/canvas-kit-styling'; import {mergeStyles} from '@workday/canvas-kit-react/layout';<br><br>// ...<br><br>// `handleCsProp` handles compat mode with Emotion's runtime APIs. `mergeStyles` has the same // function signature, but adds support for style props.<br><br>return (  <Element    {...handleCsProp(elemProps, [      myStyles,      myModifiers({ size: 'medium' }),      myVars({ backgroundColor: 'red' })    ])}  >    {children}  </Element> ) ``` |
| color | `string` |  | The color of the SystemIcon. This defines `accent` and `fill`. `color` may be overwritten by `accent` and `fill`. |
| children | [`ReactNode`](https://reactjs.org/docs/rendering-elements.html) |  |  |
| accent | `string` |  | The accent color of the SystemIcon. This overrides `color`. |
| background | `string` |  | The background color of the SystemIcon. |
| fillIcon | `boolean` |  | Whether the icon should received filled (colored background layer) or regular styles. Corresponds to `toggled` in ToolbarIconButton |
| grow | `boolean` |  | True if the component should grow to its container's width. False otherwise. |
| as | [`React.ElementType`](https://developer.mozilla.org/en-US/docs/Web/API/element) | `button` | Optional override of the default element used by the component. Any valid tag or Component. If you provided a Component, this component should forward the ref using `React.forwardRef`and spread extra props to a root element.<br><br>**Note:** Not all elements make sense and some elements may cause accessibility issues. Change this value with care. |
| ref | [`React.Ref`](https://reactjs.org/docs/refs-and-the-dom.html) |  | Optional ref. If the component represents an element, this ref will be a reference to the real DOM element of the component. If `as` is set to an element, it will be that element. If `as` is a component, the reference will be to that component (or element if the component uses `React.forwardRef`). |

## SecondaryButton

**Component Type:** `enhancedComponent`

**Display Name:** `SecondaryButton`

**Base Element:** [button](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button)

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| variant | `"inverse"` |  | Variant has an option for `inverse` which will inverse the styling |
| iconPosition | `"start"` | `"end"` | `"start"` | Button icon positions can either be `start` or `end`. If no value is provided, it defaults to `start`. |
| shouldMirrorIcon | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the icon should mirror only when in an right-to-left language, use `shouldMirrorIconInRTL` instead. |
| shouldMirrorIconInRTL | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| size | `ButtonSizes` | `'medium` | There are four button sizes: `extraSmall`, `small`, `medium`, and `large`. If no size is provided, it will default to `medium`. |
| colors | `ButtonColors` |  | Override default colors of a button. The default will depend on the button type |
| icon | `CanvasSystemIcon` |  | The icon of the Button. Note: Not displayed at `small` size |
| shouldMirror | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the SVG should mirror only when in an right-to-left language, use `shouldMirrorInRTL` instead. |
| shouldMirrorInRTL | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| cs | `CSToPropsInput` |  | The `cs` prop takes in a single value or an array of values. You can pass the CSS class name returned by {@link createStyles }, or the result of {@link createVars } and {@link createModifiers }. If you're extending a component already using `cs`, you can merge that prop in as well. Any style that is passed to the `cs` prop will override style props. If you wish to have styles that are overridden by the `css` prop, or styles added via the `styled` API, use {@link handleCsProp } wherever `elemProps` is used. If your component needs to also handle style props, use `mergeStyles` instead.<br><br> ```tsx import {handleCsProp} from '@workday/canvas-kit-styling'; import {mergeStyles} from '@workday/canvas-kit-react/layout';<br><br>// ...<br><br>// `handleCsProp` handles compat mode with Emotion's runtime APIs. `mergeStyles` has the same // function signature, but adds support for style props.<br><br>return (  <Element    {...handleCsProp(elemProps, [      myStyles,      myModifiers({ size: 'medium' }),      myVars({ backgroundColor: 'red' })    ])}  >    {children}  </Element> ) ``` |
| color | `string` |  | The color of the SystemIcon. This defines `accent` and `fill`. `color` may be overwritten by `accent` and `fill`. |
| children | [`ReactNode`](https://reactjs.org/docs/rendering-elements.html) |  |  |
| accent | `string` |  | The accent color of the SystemIcon. This overrides `color`. |
| background | `string` |  | The background color of the SystemIcon. |
| fillIcon | `boolean` |  | Whether the icon should received filled (colored background layer) or regular styles. Corresponds to `toggled` in ToolbarIconButton |
| grow | `boolean` |  | True if the component should grow to its container's width. False otherwise. |
| as | [`React.ElementType`](https://developer.mozilla.org/en-US/docs/Web/API/element) | `button` | Optional override of the default element used by the component. Any valid tag or Component. If you provided a Component, this component should forward the ref using `React.forwardRef`and spread extra props to a root element.<br><br>**Note:** Not all elements make sense and some elements may cause accessibility issues. Change this value with care. |
| ref | [`React.Ref`](https://reactjs.org/docs/refs-and-the-dom.html) |  | Optional ref. If the component represents an element, this ref will be a reference to the real DOM element of the component. If `as` is set to an element, it will be that element. If `as` is a component, the reference will be to that component (or element if the component uses `React.forwardRef`). |

## TertiaryButton

**Component Type:** `enhancedComponent`

**Display Name:** `TertiaryButton`

**Base Element:** [button](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button)

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| variant | `"inverse"` |  | Variant has an option for `inverse` which will inverse the styling |
| iconPosition | `"start"` | `"end"` | `"start"` | Button icon positions can either be `start` or `end`. If no value is provided, it defaults to `start`. |
| shouldMirrorIcon | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the icon should mirror only when in an right-to-left language, use `shouldMirrorIconInRTL` instead. |
| shouldMirrorIconInRTL | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| size | `ButtonSizes` | `"medium"` | There are four button sizes: `extraSmall`, `small`, `medium`, and `large`. If no size is provided, it will default to `medium`. |
| colors | `ButtonColors` |  | Override default colors of a button. The default will depend on the button type |
| icon | `CanvasSystemIcon` |  | The icon of the Button. Note: Not displayed at `small` size |
| shouldMirror | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the SVG should mirror only when in an right-to-left language, use `shouldMirrorInRTL` instead. |
| shouldMirrorInRTL | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| cs | `CSToPropsInput` |  | The `cs` prop takes in a single value or an array of values. You can pass the CSS class name returned by {@link createStyles }, or the result of {@link createVars } and {@link createModifiers }. If you're extending a component already using `cs`, you can merge that prop in as well. Any style that is passed to the `cs` prop will override style props. If you wish to have styles that are overridden by the `css` prop, or styles added via the `styled` API, use {@link handleCsProp } wherever `elemProps` is used. If your component needs to also handle style props, use `mergeStyles` instead.<br><br> ```tsx import {handleCsProp} from '@workday/canvas-kit-styling'; import {mergeStyles} from '@workday/canvas-kit-react/layout';<br><br>// ...<br><br>// `handleCsProp` handles compat mode with Emotion's runtime APIs. `mergeStyles` has the same // function signature, but adds support for style props.<br><br>return (  <Element    {...handleCsProp(elemProps, [      myStyles,      myModifiers({ size: 'medium' }),      myVars({ backgroundColor: 'red' })    ])}  >    {children}  </Element> ) ``` |
| color | `string` |  | The color of the SystemIcon. This defines `accent` and `fill`. `color` may be overwritten by `accent` and `fill`. |
| children | [`ReactNode`](https://reactjs.org/docs/rendering-elements.html) |  |  |
| accent | `string` |  | The accent color of the SystemIcon. This overrides `color`. |
| background | `string` |  | The background color of the SystemIcon. |
| fillIcon | `boolean` |  | Whether the icon should received filled (colored background layer) or regular styles. Corresponds to `toggled` in ToolbarIconButton |
| grow | `boolean` |  | True if the component should grow to its container's width. False otherwise. |
| as | [`React.ElementType`](https://developer.mozilla.org/en-US/docs/Web/API/element) | `button` | Optional override of the default element used by the component. Any valid tag or Component. If you provided a Component, this component should forward the ref using `React.forwardRef`and spread extra props to a root element.<br><br>**Note:** Not all elements make sense and some elements may cause accessibility issues. Change this value with care. |
| ref | [`React.Ref`](https://reactjs.org/docs/refs-and-the-dom.html) |  | Optional ref. If the component represents an element, this ref will be a reference to the real DOM element of the component. If `as` is set to an element, it will be that element. If `as` is a component, the reference will be to that component (or element if the component uses `React.forwardRef`). |

## DeleteButton

Use sparingly for destructive actions that will result in data loss, can’t be undone, or will
have significant consequences. They commonly appear in confirmation dialogs as the final
confirmation before being deleted.

**Component Type:** `enhancedComponent`

**Display Name:** `DeleteButton`

**Base Element:** [button](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button)

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| variant | `"outline"` |  | Variant has an option for `outline` which will reverse the styling of the button |
| iconPosition | `"start"` | `"end"` | `"start"` | Button icon positions can either be `start` or `end`. If no value is provided, it defaults to `start`. |
| shouldMirrorIcon | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the icon should mirror only when in an right-to-left language, use `shouldMirrorIconInRTL` instead. |
| shouldMirrorIconInRTL | `boolean` | `false` | If set to `true`, transform the icon's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| size | `ButtonSizes` | `'medium` | There are four button sizes: `extraSmall`, `small`, `medium`, and `large`. If no size is provided, it will default to `medium`. |
| colors | `ButtonColors` |  | Override default colors of a button. The default will depend on the button type |
| icon | `CanvasSystemIcon` |  | The icon of the Button. Note: Not displayed at `small` size |
| shouldMirror | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic. Use this if you want to always mirror the icon regardless of the content direction. If the SVG should mirror only when in an right-to-left language, use `shouldMirrorInRTL` instead. |
| shouldMirrorInRTL | `boolean` | `false` | If set to `true`, transform the SVG's x-axis to mirror the graphic when the content direction is `rtl`. Icons don't have enough context to know if they should be mirrored in all cases. Setting this to `true` indicates the icon should be mirrored in right-to-left languages. |
| cs | `CSToPropsInput` |  | The `cs` prop takes in a single value or an array of values. You can pass the CSS class name returned by {@link createStyles }, or the result of {@link createVars } and {@link createModifiers }. If you're extending a component already using `cs`, you can merge that prop in as well. Any style that is passed to the `cs` prop will override style props. If you wish to have styles that are overridden by the `css` prop, or styles added via the `styled` API, use {@link handleCsProp } wherever `elemProps` is used. If your component needs to also handle style props, use `mergeStyles` instead.<br><br> ```tsx import {handleCsProp} from '@workday/canvas-kit-styling'; import {mergeStyles} from '@workday/canvas-kit-react/layout';<br><br>// ...<br><br>// `handleCsProp` handles compat mode with Emotion's runtime APIs. `mergeStyles` has the same // function signature, but adds support for style props.<br><br>return (  <Element    {...handleCsProp(elemProps, [      myStyles,      myModifiers({ size: 'medium' }),      myVars({ backgroundColor: 'red' })    ])}  >    {children}  </Element> ) ``` |
| color | `string` |  | The color of the SystemIcon. This defines `accent` and `fill`. `color` may be overwritten by `accent` and `fill`. |
| children | [`ReactNode`](https://reactjs.org/docs/rendering-elements.html) |  |  |
| accent | `string` |  | The accent color of the SystemIcon. This overrides `color`. |
| background | `string` |  | The background color of the SystemIcon. |
| fillIcon | `boolean` |  | Whether the icon should received filled (colored background layer) or regular styles. Corresponds to `toggled` in ToolbarIconButton |
| grow | `boolean` |  | True if the component should grow to its container's width. False otherwise. |
| as | [`React.ElementType`](https://developer.mozilla.org/en-US/docs/Web/API/element) | `button` | Optional override of the default element used by the component. Any valid tag or Component. If you provided a Component, this component should forward the ref using `React.forwardRef`and spread extra props to a root element.<br><br>**Note:** Not all elements make sense and some elements may cause accessibility issues. Change this value with care. |
| ref | [`React.Ref`](https://reactjs.org/docs/refs-and-the-dom.html) |  | Optional ref. If the component represents an element, this ref will be a reference to the real DOM element of the component. If `as` is set to an element, it will be that element. If `as` is a component, the reference will be to that component (or element if the component uses `React.forwardRef`). |

## How Buttons Impact the Accessible Experience

When buttons are disabled on the UI, color contrast guidelines do not apply to disabled components.
Minimum contrast guidelines set in WCAG 2.1 explicitly state
[disabled components are exempt](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html#inactive-controls)
from the guideline.

When identical buttons are used repeatedly on a screen, users must correctly identify the context
around the buttons that cannot be distinguished from one another.

- For example: Pencil icon buttons used repeatedly on a profile screen, each designed to edit a
  section of the profile. Providing uniquely descriptive names (e.g. “Edit photo”, “Edit contact
  info”) for each icon button can be valuable for screen reader users.

When icons are used inside of buttons containing text, a text alternative is only necessary when the
icon is communicating something about the button.

- For example: A ‘+’ icon used in a skill pill named “communication” signals an action that is not
  expressed in the text.
- On the other hand: An icon of an eye used to decorate a “View Details” button is redundant and
  should be hidden from screen readers.

## Content Guidelines

- See the
  [Buttons and Calls to Action](https://canvas.workdaydesign.com/guidelines/content/ui-text/buttons-and-calls-to-action)
  page in the UI Text section of the Content Style Guide for button language guidelines.
- When writing Tooltips to pair with icon-only variants, refer to the
  [Tooltips](https://canvas.workdaydesign.com/guidelines/content/ui-text/tooltips-and-toasts)
  section of the Content Style Guide.