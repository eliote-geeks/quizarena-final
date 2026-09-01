import { AnimatePresence, motion } from "framer-motion";

/** Aperçu en grand de l'image — même mécanique que Solo (§QuizPlay.jsx zoomedImage). */
export default function ImageLightbox({ image, onClose }) {
  return (
    <AnimatePresence>
      {image && (
        <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.figure className="relative max-h-full max-w-5xl" initial={{ scale: .96 }} animate={{ scale: 1 }} exit={{ scale: .96 }} onClick={(event) => event.stopPropagation()}>
            <img src={image.url} alt={image.alt} className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain" />
            <button className="btn-secondary absolute right-3 top-3 rounded-xl px-3 py-2 text-xs" onClick={onClose}>Fermer</button>
            <figcaption className="mt-3 text-center text-sm text-white/75">Appuie à l’extérieur pour fermer</figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
