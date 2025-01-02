<?php

include('Coordinate.php');

final class GeolocalisableEquipment implements JsonSerializable
{
    private $coordinate;
    private $eqLogic;

    private $id;
    private $name;
    private $humanName;
    private $fullHumanName;
    private $icon;

    public function __construct(eqLogic $eqLogic)
    {
        if (class_exists(jMQTT::class) && $eqLogic instanceof jMQTT && $eqLogic->getType() === jMQTTConst::TYP_BRK) {
            return;
        }

        /** @var cmd|null $cmdLatitude */
        $cmdLatitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LATITUDE_CMD_NAME);
        /** @var cmd|null $cmdLongitude */
        $cmdLongitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LONGITUDE_CMD_NAME);

        $latitude = $cmdLatitude ? $cmdLatitude->execCmd() : null;
        $longitude = $cmdLongitude ? $cmdLongitude->execCmd() : null;

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $this->eqLogic = $eqLogic;
            $this->coordinate = new Coordinate((float)$latitude, (float)$longitude);
        }

        $this->id = $eqLogic->getId();
        $this->name = $eqLogic->getName();
        $this->humanName = $eqLogic->getHumanName(true, true);
        $this->fullHumanName = $this->buildFullHumanName($eqLogic);
        $this->icon = $eqLogic->getConfiguration('icone');
    }

    public function getCoordinate(): Coordinate
    {
        return $this->coordinate;
    }

    public function hasCoordinate(): bool
    {
        return null !== $this->coordinate;
    }


    public function getEqLogic(): eqLogic
    {
        return $this->eqLogic;
    }

    /**
     * @return mixed
     */
    public function getId()
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getHumanName(): string
    {
        return $this->humanName;
    }

    public function getFullHumanName(): string
    {
        return $this->fullHumanName;
    }

    /**
     * @return array|bool|mixed|string
     */
    public function getIcon()
    {
        return $this->icon;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'humanName' => $this->humanName,
            'fullHumanName' => $this->fullHumanName,
            'icon' => $this->icon,
            'latitude' => $this->coordinate ? $this->coordinate->getLatitude() : null,
            'longitude' => $this->coordinate ? $this->coordinate->getLongitude() : null,
        ];
    }

    private function buildFullHumanName(eqLogic $eqLogic): string
    {
        $object = $eqLogic->getObject();
        if (null === $object) {
            return $eqLogic->getName();
        }
        $fullHumanName = [$object->getName()];
        while ($father = $object->getFather()) {
            $fullHumanName[] = $father->getName();
            $object = $father;
        }

        $fullHumanName = array_reverse($fullHumanName);
        $fullHumanName[] = $eqLogic->getName();

        return implode(' - ', $fullHumanName);
    }
}
