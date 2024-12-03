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

    public function __construct(jMQTT $JMQTT)
    {
        /** @var cmd[] $cmds */
        $cmds = $JMQTT->getCmd();
        $latitude = null;
        $longitude = null;
        foreach ($cmds as $cmd) {
            if ('latitude' === $cmd->getName()) {
//                $cmd->addHistoryValue();
                $latitude = $cmd->execCmd();
            }
            if ('longitude' === $cmd->getName()) {
                $longitude = $cmd->execCmd();
            }
        }

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $this->eqLogic = $JMQTT;
            $this->coordinate = new Coordinate((float)$latitude, (float)$longitude);
        }

        $this->id = $JMQTT->getId();
        $this->name = $JMQTT->getName();
        $this->humanName = $JMQTT->getHumanName(true, true);
        $this->fullHumanName = $this->buildFullHumanName($JMQTT);
        $this->icon = $JMQTT->getConfiguration('icone');

    }

    public function getCoordinate(): Coordinate
    {
        return $this->coordinate;
    }

    public function hasCoordinate(): bool
    {
        return null !== $this->coordinate;
    }


    public function getEqLogic(): jMQTT
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
            'latitude' => $this->coordinate->getLatitude(),
            'longitude' => $this->coordinate->getLongitude(),
        ];
    }

    private function buildFullHumanName(jMQTT $jMQTT): string
    {
        $jMQTTObject = $jMQTT->getObject();
        $fullHumanName = [$jMQTTObject->getName()];
        while ($father = $jMQTTObject->getFather()) {
            $fullHumanName[] = $father->getName();
            $jMQTTObject = $father;
        }

        $fullHumanName = array_reverse($fullHumanName);
        $fullHumanName[] = $jMQTT->getName();

        return implode(' - ', $fullHumanName);
    }
}
