import * as React from "react"
import { X } from "lucide-react"
import { Drawer as DrawerPrimitive } from "vaul"
import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = false,
  handleOnly = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    handleOnly={handleOnly}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerPortal = DrawerPrimitive.Portal
const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-[#20382b]/40 backdrop-blur-[3px]", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null)
  const attachRef = React.useCallback((node: HTMLDivElement | null) => {
    setElement(node)
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }, [ref])

  React.useLayoutEffect(() => {
    if (!element) return
    const viewport = window.visualViewport
    const shell = document.querySelector<HTMLElement>(".mobile-shell")
    const update = () => {
      const bounds = shell?.getBoundingClientRect()
      const width = bounds?.width ?? Math.min(document.documentElement.clientWidth, 430)
      const left = bounds?.left ?? (document.documentElement.clientWidth - width) / 2
      element.style.setProperty("--drawer-viewport-height", `${viewport?.height ?? window.innerHeight}px`)
      element.style.setProperty("--drawer-left", `${left}px`)
      element.style.setProperty("--drawer-width", `${width}px`)
    }
    update()
    const resize = new ResizeObserver(update)
    if (shell) resize.observe(shell)
    // Scroll locking can change body margins without resizing the fixed-width shell.
    const lock = new MutationObserver(update)
    lock.observe(document.body, { attributes: true, attributeFilter: ["style", "class", "data-scroll-locked"] })
    lock.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] })
    viewport?.addEventListener("resize", update)
    window.addEventListener("resize", update)
    return () => {
      resize.disconnect()
      lock.disconnect()
      viewport?.removeEventListener("resize", update)
      window.removeEventListener("resize", update)
    }
  }, [element])

  return (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={attachRef}
      className={cn(
        "mobile-drawer fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col rounded-t-[10px] border border-none bg-white mx-auto max-w-[430px] shadow-2xl",
        className
      )}
      {...props}
    >
      <DrawerPrimitive.Handle aria-label="Tarik untuk menutup" className="shrink-0 mx-auto mt-4 mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
      <DrawerPrimitive.Close aria-label="Tutup panel" className="drawer-close-button"><X size={19} /></DrawerPrimitive.Close>
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("shrink-0 grid gap-1.5 p-4 pr-8 text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("shrink-0 mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-slate-900",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
